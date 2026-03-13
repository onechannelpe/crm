import type { Component } from "solid-js";

type DocMetadata = {
  slug: string;
  title: string;
  description: string;
};

const docMetadata = [
  {
    slug: "getting-started",
    title: "Primeros pasos",
    description:
      "Cómo acceder al sistema y navegar por las secciones principales.",
  },
] as const satisfies readonly DocMetadata[];

type DocModule = {
  default: Component;
};

const docModules = import.meta.glob<DocModule>(
  "../../../content/docs/*.mdx",
  { eager: true },
);

export type DocSlug = (typeof docMetadata)[number]["slug"];

export type DocEntry = DocMetadata & {
  content: Component;
};

function getDocContent(slug: DocSlug): Component {
  const key = Object.keys(docModules).find((candidate) =>
    candidate.endsWith(`/${slug}.mdx`),
  );

  const content = key ? docModules[key]?.default : undefined;
  if (!content) {
    throw new Error(`Missing doc content for slug: ${slug}`);
  }

  return content;
}

export const docs: DocEntry[] = docMetadata.map((entry) => ({
  ...entry,
  content: getDocContent(entry.slug),
}));

export const docsBySlug: Record<DocSlug, DocEntry> = Object.fromEntries(
  docs.map((entry) => [entry.slug, entry]),
) as Record<DocSlug, DocEntry>;

export function isDocSlug(slug: string): slug is DocSlug {
  return slug in docsBySlug;
}
