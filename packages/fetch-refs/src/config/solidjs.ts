import type { IndexBuildInput, SourceConfig } from "../core/types.ts";

const SOLIDJS_TASK_BUCKETS = [
  {
    label: "reactivity",
    paths: [
      "concepts/intro-to-reactivity",
      "concepts/signals",
      "concepts/components/props",
      "advanced-concepts/fine-grained-reactivity",
      "reference/basic-reactivity/create-signal",
    ],
  },
  {
    label: "components",
    paths: [
      "concepts/components/basics",
      "concepts/control-flow/list-rendering",
      "reference/components/for",
      "reference/components/show",
    ],
  },
  {
    label: "routing",
    paths: [
      "solid-router/concepts/navigation",
      "solid-router/concepts/nesting",
      "solid-router/concepts/dynamic-routes",
      "solid-router/reference/primitives/use-navigate",
      "solid-start/reference/routing/file-routes",
    ],
  },
  {
    label: "data",
    paths: [
      "solid-router/data-fetching/queries",
      "solid-router/reference/data-apis/create-async",
      "solid-router/reference/data-apis/action",
      "solid-start/building-your-application/data-fetching",
      "solid-start/building-your-application/data-mutation",
    ],
  },
  {
    label: "server",
    paths: [
      "solid-start/advanced/middleware",
      "solid-start/advanced/request-events",
      "solid-start/building-your-application/api-routes",
      "solid-start/reference/server/create-handler",
      "solid-start/reference/server/create-middleware",
      "solid-start/reference/server/use-server",
      "reference/server-utilities/get-request-event",
    ],
  },
  {
    label: "auth-session",
    paths: [
      "solid-start/advanced/auth",
      "solid-start/advanced/session",
      "solid-start/guides/security",
    ],
  },
  {
    label: "tooling",
    paths: [
      "solid-start/getting-started",
      "solid-start/reference/config/define-config",
      "configuration/typescript",
      "guides/testing",
    ],
  },
] as const;

function withoutExt(path: string): string {
  return path.replace(/\.mdx?$/, "");
}

function buildSolidjsIndex({
  localPath,
  sourceName,
  files,
}: IndexBuildInput): string {
  const available = new Set(files.map((file) => withoutExt(file.relativePath)));

  const renderSection = (
    label: string,
    paths: readonly string[],
  ): string | null => {
    const present = paths.filter((path) => available.has(path));
    if (present.length === 0) return null;
    return `${label}:{${present.join(",")}}`;
  };

  const curatedSections = SOLIDJS_TASK_BUCKETS.map((section) =>
    renderSection(section.label, section.paths),
  ).filter((section): section is string => section !== null);

  return [`[${sourceName} Docs]|root:${localPath}`, ...curatedSections].join(
    "|",
  );
}

export const solidjsConfig: SourceConfig = {
  name: "SolidJS",
  repo: "https://github.com/solidjs/solid-docs.git",
  mounts: [{ repoPath: "src/routes", localPath: ".refs/solidjs-docs" }],
  index: {
    markerStart: "<!-- SOLIDJS-DOCS-START -->",
    markerEnd: "<!-- SOLIDJS-DOCS-END -->",
    filter: (files) =>
      files.filter(
        (f) =>
          f.relativePath.startsWith("reference/") ||
          f.relativePath.startsWith("concepts/") ||
          f.relativePath.startsWith("advanced-concepts/") ||
          f.relativePath.startsWith("solid-router/") ||
          f.relativePath.startsWith("solid-start/") ||
          f.relativePath.startsWith("configuration/") ||
          f.relativePath.startsWith("guides/"),
      ),
    compile: buildSolidjsIndex,
  },
};
