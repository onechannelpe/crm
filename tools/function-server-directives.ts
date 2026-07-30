import { readdir } from "node:fs/promises";
import { join } from "node:path";
import ts from "../apps/web/node_modules/typescript/lib/typescript.js";

async function actionFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? actionFiles(path) : [path];
    }),
  );
  return files.flat().filter((path) => path.endsWith(".action.ts"));
}

for (const path of await actionFiles("apps/web/src/actions")) {
  const original = await Bun.file(path).text();
  const source = original.replace(/^"use server";\s*/, "");
  const parsed = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const insertions: number[] = [];

  for (const statement of parsed.statements) {
    if (!ts.isFunctionDeclaration(statement) || !statement.body) {
      continue;
    }

    const modifiers = statement.modifiers ?? [];
    const isExported = modifiers.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    const isAsync = modifiers.some(
      (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword,
    );
    if (isExported && isAsync) {
      insertions.push(statement.body.getStart(parsed) + 1);
    }
  }

  let migrated = source;
  for (const position of insertions.toSorted((a, b) => b - a)) {
    migrated =
      migrated.slice(0, position) +
      '\n  "use server";\n' +
      migrated.slice(position);
  }

  await Bun.write(path, migrated);
}
