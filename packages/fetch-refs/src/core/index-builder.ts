import { dirname, basename } from "node:path";

import { Glob } from "bun";

import type { SourceFile, SourceSection } from "./types.ts";

export async function buildCompactIndex(
  localPath: string,
  sourceName: string,
  filter?: (files: SourceFile[]) => SourceFile[],
): Promise<string> {
  const files = await collectSourceFiles(localPath, filter);
  const sections = groupIntoSections(files);
  return formatCompactIndex(localPath, sourceName, sections);
}

async function collectSourceFiles(
  localPath: string,
  filter?: (files: SourceFile[]) => SourceFile[],
): Promise<SourceFile[]> {
  const glob = new Glob("**/*.{md,mdx}");
  const files: SourceFile[] = [];

  for await (const file of glob.scan(localPath)) {
    const relativePath = file.replace(/\\/g, "/");
    const category =
      dirname(relativePath) === "." ? undefined : dirname(relativePath);
    const ext = relativePath.endsWith(".mdx") ? ".mdx" : ".md";
    const name = basename(relativePath, ext);
    files.push({ relativePath, category, name });
  }

  return filter ? filter(files) : files;
}

function groupIntoSections(files: SourceFile[]): SourceSection[] {
  const tree = new Map<string, Set<string>>();

  for (const file of files) {
    const dir = file.category ?? "root";
    if (!tree.has(dir)) tree.set(dir, new Set());
    tree.get(dir)!.add(file.name);
  }

  return Array.from(tree.entries())
    .map(([directory, filesSet]) => ({
      directory,
      files: Array.from(filesSet).sort(),
    }))
    .sort((a, b) => {
      if (a.directory === "root") return -1;
      if (b.directory === "root") return 1;
      return a.directory.localeCompare(b.directory);
    });
}

function formatCompactIndex(
  localPath: string,
  sourceName: string,
  sections: SourceSection[],
): string {
  const parts = sections.map((s) => `${s.directory}:{${s.files.join(",")}}`);
  return `[${sourceName} Docs]|root:${localPath}|${parts.join("|")}`;
}
