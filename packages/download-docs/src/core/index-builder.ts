import { dirname, basename } from "node:path";

import { Glob } from "bun";

import type { DocFile, DocSection } from "./types.ts";

export async function buildCompactIndex(
  docsRoot: string,
  frameworkName: string,
  transform?: (files: DocFile[]) => DocFile[],
): Promise<string> {
  const files = await collectDocFiles(docsRoot, transform);
  const sections = buildDocTree(files);
  return generateCompactIndex(docsRoot, frameworkName, sections);
}

async function collectDocFiles(
  docsRoot: string,
  transform?: (files: DocFile[]) => DocFile[],
): Promise<DocFile[]> {
  const glob = new Glob("**/*.{md,mdx}");
  const files: DocFile[] = [];

  for await (const file of glob.scan(docsRoot)) {
    const relativePath = file.replace(/\\/g, "/");
    const category =
      dirname(relativePath) === "." ? undefined : dirname(relativePath);
    const name = basename(
      relativePath,
      basename(relativePath).endsWith(".mdx") ? ".mdx" : ".md",
    );

    files.push({ relativePath, category, name });
  }

  return transform ? transform(files) : files;
}

function buildDocTree(files: DocFile[]): DocSection[] {
  const tree = new Map<string, Set<string>>();

  for (const file of files) {
    const dir = file.category || "root";
    if (!tree.has(dir)) {
      tree.set(dir, new Set());
    }
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

function generateCompactIndex(
  docsRoot: string,
  frameworkName: string,
  sections: DocSection[],
): string {
  const parts = sections.map((section) => {
    const key =
      section.directory === "root"
        ? "root"
        : section.directory.replace(/\//g, "/");
    const fileList = section.files.join(",");
    return `${key}:{${fileList}}`;
  });

  return `[${frameworkName} Docs]|root:${docsRoot}|${parts.join("|")}`;
}
