/**
 * Build-time script: compiles .mjml templates → TypeScript modules exporting
 * typed render functions. No runtime MJML dependency — run this once and commit
 * the generated files are gitignored; CI runs this before type-checking.
 *
 * Run via:
 *   bun run build:emails  (from packages/notifications or workspace root)
 *
 * Conventions in .mjml source:
 *   {{param}}                    required string parameter
 *   <!-- crm:if:param --> ... <!-- crm:endif -->
 *                                optional HTML block (typed as param?: string)
 *   <!-- crm:multiline:param --> marks param for \n → <br/> conversion in HTML
 *
 * Each .mjml must have a companion .txt file (same basename) for the plain-text
 * fallback. Supported syntax in .txt:
 *   {{param}}                    string interpolation
 *   {{#if param}}...{{/if}}      conditional text block
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import mjml2html from "mjml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "../src/templates");
const outDir = join(templatesDir, "compiled");

mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HtmlChunk =
  | { type: "literal"; value: string }
  | { type: "param"; name: string }
  | { type: "ifblock"; param: string; inner: HtmlChunk[] };

type TextChunk =
  | { type: "literal"; value: string }
  | { type: "param"; name: string }
  | { type: "ifblock"; param: string; inner: TextChunk[] };

// ---------------------------------------------------------------------------
// MJML pre-processing — replace crm: directives before passing to MJML
// ---------------------------------------------------------------------------

function extractMultilineParams(source: string): Set<string> {
  const out = new Set<string>();
  for (const m of source.matchAll(
    /<!--\s*crm:multiline:([a-zA-Z][a-zA-Z0-9_]*)\s*-->/g,
  )) {
    out.add(m[1]!);
  }
  return out;
}

/**
 * Replaces crm:if/endif with sentinel HTML comments that survive MJML
 * compilation, and strips crm:multiline annotations.
 */
function prepareMjml(source: string): string {
  return source
    .replace(
      /<!--\s*crm:if:([a-zA-Z][a-zA-Z0-9_]*)\s*-->/g,
      "<!-- __CRM_IF_$1__ -->",
    )
    .replace(/<!--\s*crm:endif\s*-->/g, "<!-- __CRM_ENDIF__ -->")
    .replace(/<!--\s*crm:multiline:[a-zA-Z][a-zA-Z0-9_]*\s*-->/g, "");
}

// ---------------------------------------------------------------------------
// HTML chunk parser — splits compiled HTML into a typed segment tree
// ---------------------------------------------------------------------------

function splitByParams(html: string): HtmlChunk[] {
  const chunks: HtmlChunk[] = [];
  let lastIndex = 0;
  for (const m of html.matchAll(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g)) {
    const before = html.slice(lastIndex, m.index);
    if (before) chunks.push({ type: "literal", value: before });
    chunks.push({ type: "param", name: m[1]! });
    lastIndex = m.index! + m[0].length;
  }
  const remainder = html.slice(lastIndex);
  if (remainder) chunks.push({ type: "literal", value: remainder });
  return chunks;
}

function parseHtmlChunks(html: string): HtmlChunk[] {
  const ifMatch = /<!--\s*__CRM_IF_([a-zA-Z][a-zA-Z0-9_]*)__\s*-->/.exec(html);
  if (!ifMatch) return splitByParams(html);

  const param = ifMatch[1]!;
  const beforeIf = html.slice(0, ifMatch.index);
  const rest = html.slice(ifMatch.index! + ifMatch[0].length);

  const endifMatch = /<!--\s*__CRM_ENDIF__\s*-->/.exec(rest);
  if (!endifMatch) throw new Error(`Unmatched crm:if:${param} — no crm:endif`);

  const inner = rest.slice(0, endifMatch.index);
  const after = rest.slice(endifMatch.index! + endifMatch[0].length);

  return [
    ...splitByParams(beforeIf),
    { type: "ifblock", param, inner: parseHtmlChunks(inner) },
    ...parseHtmlChunks(after),
  ];
}

// ---------------------------------------------------------------------------
// Text template parser
// ---------------------------------------------------------------------------

function splitTextByParams(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g)) {
    const before = text.slice(lastIndex, m.index);
    if (before) chunks.push({ type: "literal", value: before });
    chunks.push({ type: "param", name: m[1]! });
    lastIndex = m.index! + m[0].length;
  }
  const remainder = text.slice(lastIndex);
  if (remainder) chunks.push({ type: "literal", value: remainder });
  return chunks;
}

function parseTextChunks(text: string): TextChunk[] {
  const ifMatch = /\{\{#if ([a-zA-Z][a-zA-Z0-9_]*)\}\}/.exec(text);
  if (!ifMatch) return splitTextByParams(text);

  const param = ifMatch[1]!;
  const beforeIf = text.slice(0, ifMatch.index);
  const rest = text.slice(ifMatch.index! + ifMatch[0].length);

  const endifMatch = /\{\{\/if\}\}/.exec(rest);
  if (!endifMatch)
    throw new Error(`Unmatched {{#if ${param}}} in text template`);

  const inner = rest.slice(0, endifMatch.index);
  const after = rest.slice(endifMatch.index! + endifMatch[0].length);

  return [
    ...splitTextByParams(beforeIf),
    { type: "ifblock", param, inner: parseTextChunks(inner) },
    ...parseTextChunks(after),
  ];
}

// ---------------------------------------------------------------------------
// Param collection
// ---------------------------------------------------------------------------

function collectParams(chunks: HtmlChunk[]): {
  all: string[];
  optional: Set<string>;
} {
  const seen = new Set<string>();
  const all: string[] = [];
  const optional = new Set<string>();

  function visit(cs: HtmlChunk[]): void {
    for (const c of cs) {
      if (c.type === "param") {
        if (!seen.has(c.name)) {
          seen.add(c.name);
          all.push(c.name);
        }
      } else if (c.type === "ifblock") {
        optional.add(c.param);
        if (!seen.has(c.param)) {
          seen.add(c.param);
          all.push(c.param);
        }
        visit(c.inner);
      }
    }
  }

  visit(chunks);
  return { all, optional };
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function escLiteral(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function genHtmlExpr(chunks: HtmlChunk[], multiline: Set<string>): string {
  if (chunks.length === 0) return '""';
  return chunks
    .map((c) => {
      if (c.type === "literal") return "`" + escLiteral(c.value) + "`";
      if (c.type === "param") {
        const base = `esc(p.${c.name})`;
        return multiline.has(c.name)
          ? `${base}.replace(/\\n/g, "<br/>")`
          : base;
      }
      // ifblock: ternary — include full section or empty string
      const inner = genHtmlExpr(c.inner, multiline);
      return `(p.${c.param}?.trim() ? ${inner} : "")`;
    })
    .join(" +\n    ");
}

function genTextExpr(chunks: TextChunk[]): string {
  if (chunks.length === 0) return '""';
  return chunks
    .map((c) => {
      if (c.type === "literal") return JSON.stringify(c.value);
      if (c.type === "param") return `p.${c.name}`;
      const inner = genTextExpr(c.inner);
      return `(p.${c.param}?.trim() ? ${inner} : "")`;
    })
    .join(" +\n    ");
}

function pascal(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function genInterface(
  ifaceName: string,
  params: string[],
  optional: Set<string>,
): string {
  const fields = params
    .map((name) => `  ${name}${optional.has(name) ? "?" : ""}: string;`)
    .join("\n");
  return `export interface ${ifaceName} {\n${fields}\n}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const mjmlFiles = readdirSync(templatesDir).filter((f) => f.endsWith(".mjml"));

if (mjmlFiles.length === 0) {
  console.error("No .mjml files found in", templatesDir);
  process.exit(1);
}

for (const file of mjmlFiles) {
  const name = basename(file, ".mjml");
  const mjmlSource = readFileSync(join(templatesDir, file), "utf-8");
  const txtSource = readFileSync(join(templatesDir, `${name}.txt`), "utf-8");

  const multilineParams = extractMultilineParams(mjmlSource);
  const { html, errors } = mjml2html(prepareMjml(mjmlSource), {
    validationLevel: "strict",
  });

  if (errors.length > 0) {
    for (const err of errors) console.error(`[${file}]`, err.formattedMessage);
    process.exit(1);
  }

  const htmlChunks = parseHtmlChunks(html);
  const textChunks = parseTextChunks(txtSource);
  const { all: allParams, optional } = collectParams(htmlChunks);

  const funcName = `render${pascal(name)}Email`;
  const ifaceName = `${pascal(name)}EmailParams`;
  const htmlExpr = genHtmlExpr(htmlChunks, multilineParams);
  const textExpr = genTextExpr(textChunks);

  const out = [
    `// AUTO-GENERATED by scripts/build-emails.ts — do not edit manually.`,
    `// Source: src/templates/${file} + ${name}.txt`,
    `// Regenerate: bun run build:emails (from packages/notifications)`,
    ``,
    `import { esc } from "../../utils.js";`,
    ``,
    genInterface(ifaceName, allParams, optional),
    ``,
    `export function ${funcName}(p: ${ifaceName}): { html: string; text: string } {`,
    `  return {`,
    `    html:`,
    `      ${htmlExpr},`,
    `    text:`,
    `      ${textExpr},`,
    `  };`,
    `}`,
    ``,
  ].join("\n");

  writeFileSync(join(outDir, `${name}.ts`), out, "utf-8");
  console.log(`✓ compiled ${file} → compiled/${name}.ts`);
}
