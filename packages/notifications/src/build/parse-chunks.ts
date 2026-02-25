export type HtmlChunk =
  | { type: "literal"; value: string }
  | { type: "param"; name: string }
  | { type: "ifblock"; param: string; inner: HtmlChunk[] };

export type TextChunk =
  | { type: "literal"; value: string }
  | { type: "param"; name: string }
  | { type: "ifblock"; param: string; inner: TextChunk[] };

const PARAM_RE = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g;

function splitByParams(html: string): HtmlChunk[] {
  const chunks: HtmlChunk[] = [];
  let lastIndex = 0;
  for (const m of html.matchAll(PARAM_RE)) {
    const before = html.slice(lastIndex, m.index);
    if (before) chunks.push({ type: "literal", value: before });
    chunks.push({ type: "param", name: m[1]! });
    lastIndex = m.index! + m[0].length;
  }
  const remainder = html.slice(lastIndex);
  if (remainder) chunks.push({ type: "literal", value: remainder });
  return chunks;
}

export function parseHtmlChunks(html: string): HtmlChunk[] {
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

function splitTextByParams(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(PARAM_RE)) {
    const before = text.slice(lastIndex, m.index);
    if (before) chunks.push({ type: "literal", value: before });
    chunks.push({ type: "param", name: m[1]! });
    lastIndex = m.index! + m[0].length;
  }
  const remainder = text.slice(lastIndex);
  if (remainder) chunks.push({ type: "literal", value: remainder });
  return chunks;
}

export function parseTextChunks(text: string): TextChunk[] {
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

export function collectParams(chunks: HtmlChunk[]): {
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
