import type { Component } from "solid-js";

type DocFrontmatter = {
  title: string;
  description: string;
  order: number;
};

type DocModule = {
  default: Component;
  frontmatter: unknown;
};

export type DocEntry = DocFrontmatter & {
  slug: string;
  content: Component;
};

const docModules = import.meta.glob<DocModule>("../../../content/docs/*.mdx", {
  eager: true,
});

function getDocSlug(path: string): string {
  const match = path.match(/\/([^/]+)\.mdx$/);
  if (!match) {
    throw new Error(`Invalid docs content path: ${path}`);
  }

  return match[1];
}

function isDocFrontmatter(value: unknown): value is DocFrontmatter {
  if (!value || typeof value !== "object") return false;
  if (!("title" in value) || typeof value.title !== "string") return false;
  if (!("description" in value) || typeof value.description !== "string") {
    return false;
  }
  if (!("order" in value) || typeof value.order !== "number") return false;
  return true;
}

function getDocEntry(path: string, module: DocModule): DocEntry {
  if (!isDocFrontmatter(module.frontmatter)) {
    throw new Error(`Invalid doc frontmatter for: ${path}`);
  }

  return {
    slug: getDocSlug(path),
    ...module.frontmatter,
    content: module.default,
  };
}

export const docs = Object.entries(docModules)
  .map(([path, module]) => getDocEntry(path, module))
  .toSorted((left, right) => left.order - right.order);

export type DocSlug = (typeof docs)[number]["slug"];

export const docsBySlug = Object.fromEntries(
  docs.map((entry) => [entry.slug, entry]),
) as Record<DocSlug, DocEntry>;

export function isDocSlug(slug: string): slug is DocSlug {
  return Object.hasOwn(docsBySlug, slug);
}

export function getDocBySlug(slug: string | undefined): DocEntry | undefined {
  if (!slug || !isDocSlug(slug)) return undefined;
  return docsBySlug[slug];
}
