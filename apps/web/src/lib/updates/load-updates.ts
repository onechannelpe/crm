import type { Component } from "solid-js";

import {
  type UpdateCadence,
  type UpdateEntry,
  type UpdateKind,
  type UpdateVisibility,
} from "~/lib/updates/types";

type UpdateFrontmatter = {
  title?: unknown;
  date?: unknown;
  kind?: unknown;
  cadence?: unknown;
  visibility?: unknown;
  tags?: unknown;
};

type UpdateModule = {
  default: Component;
  frontmatter?: unknown;
};

type ValidationIssue = {
  path: string;
  field: string;
  reason: string;
};

const updateModules = import.meta.glob<UpdateModule>(
  "../../../content/updates/*.md",
  { eager: true },
);

function getFrontmatterValue(
  frontmatter: unknown,
  key: keyof UpdateFrontmatter,
): unknown {
  if (typeof frontmatter !== "object" || frontmatter === null) return undefined;
  return Reflect.get(frontmatter, key);
}

function getSlug(path: string): string {
  const match = path.match(/\/([^/]+)\.md$/);
  if (!match) {
    return path;
  }
  return match[1];
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeKind(value: unknown): UpdateKind | null {
  return value === "release" || value === "technical" ? value : null;
}

function normalizeCadence(value: unknown): UpdateCadence | null {
  return value === "nightly" || value === "weekly" || value === "none"
    ? value
    : null;
}

function normalizeVisibility(value: unknown): UpdateVisibility | null {
  return value === "internal" ? value : null;
}

function normalizeTags(value: unknown): string[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;

  const tags = value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim() !== "",
  );

  if (tags.length !== value.length || tags.length > 8) {
    return null;
  }

  return tags;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildId(
  date: string,
  kind: UpdateKind,
  cadence: UpdateCadence,
  title: string,
) {
  return `${date}:${kind}:${cadence}:${slugify(title)}`;
}

function parseUpdate(
  path: string,
  module: UpdateModule,
): {
  entry: UpdateEntry | null;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];

  const titleValue = getFrontmatterValue(module.frontmatter, "title");
  const title = typeof titleValue === "string" ? titleValue.trim() : "";
  if (!title) {
    issues.push({ path, field: "title", reason: "required non-empty string" });
  }

  const rawDateValue = getFrontmatterValue(module.frontmatter, "date");
  const dateValue = isIsoDate(rawDateValue) ? rawDateValue : null;
  if (!dateValue) {
    issues.push({ path, field: "date", reason: "must be YYYY-MM-DD" });
  }

  const kindValue = normalizeKind(
    getFrontmatterValue(module.frontmatter, "kind"),
  );
  if (kindValue === null) {
    issues.push({
      path,
      field: "kind",
      reason: 'must be "release" or "technical"',
    });
  }

  const cadenceValue = normalizeCadence(
    getFrontmatterValue(module.frontmatter, "cadence"),
  );
  if (cadenceValue === null) {
    issues.push({
      path,
      field: "cadence",
      reason: 'must be "nightly", "weekly", or "none"',
    });
  }

  const visibilityValue = normalizeVisibility(
    getFrontmatterValue(module.frontmatter, "visibility"),
  );
  if (visibilityValue === null) {
    issues.push({ path, field: "visibility", reason: 'must be "internal"' });
  }

  const tagsValue = normalizeTags(
    getFrontmatterValue(module.frontmatter, "tags"),
  );
  if (tagsValue === null) {
    issues.push({
      path,
      field: "tags",
      reason: "must be array of 0-8 non-empty strings",
    });
  }

  if (kindValue && cadenceValue) {
    if (kindValue === "release" && cadenceValue === "none") {
      issues.push({
        path,
        field: "cadence",
        reason: 'must be "nightly" or "weekly" when kind is "release"',
      });
    }

    if (kindValue === "technical" && cadenceValue !== "none") {
      issues.push({
        path,
        field: "cadence",
        reason: 'must be "none" when kind is "technical"',
      });
    }
  }

  if (
    issues.length > 0 ||
    !dateValue ||
    !kindValue ||
    !cadenceValue ||
    !visibilityValue ||
    !tagsValue
  ) {
    return { entry: null, issues };
  }

  return {
    entry: {
      id: buildId(dateValue, kindValue, cadenceValue, title),
      slug: getSlug(path),
      title,
      date: dateValue,
      kind: kindValue,
      cadence: cadenceValue,
      visibility: visibilityValue,
      tags: tagsValue,
      content: module.default,
    },
    issues,
  };
}

function compareUpdateEntries(left: UpdateEntry, right: UpdateEntry): number {
  if (left.date !== right.date) {
    return left.date < right.date ? 1 : -1;
  }

  if (left.id === right.id) return 0;
  return left.id < right.id ? 1 : -1;
}

function validateNoDuplicates(entries: UpdateEntry[]): ValidationIssue[] {
  const seen = new Map<string, string>();
  const issues: ValidationIssue[] = [];

  for (const entry of entries) {
    const existingPath = seen.get(entry.id);
    if (existingPath) {
      issues.push({
        path: entry.slug,
        field: "id",
        reason: `duplicate derived id with ${existingPath}: ${entry.id}`,
      });
      continue;
    }

    seen.set(entry.id, entry.slug);
  }

  return issues;
}

function loadValidatedUpdates(): readonly UpdateEntry[] {
  const issues: ValidationIssue[] = [];

  const entries = Object.entries(updateModules)
    .map(([path, module]) => parseUpdate(path, module))
    .flatMap((result) => {
      issues.push(...result.issues);
      return result.entry ? [result.entry] : [];
    });

  issues.push(...validateNoDuplicates(entries));

  if (issues.length > 0) {
    const message = issues
      .map((issue) => `- ${issue.path} [${issue.field}]: ${issue.reason}`)
      .join("\n");
    throw new Error(`[updates] content validation failed:\n${message}`);
  }

  return entries.toSorted(compareUpdateEntries);
}

const validatedUpdates = loadValidatedUpdates();

export function loadUpdates(): readonly UpdateEntry[] {
  return validatedUpdates;
}
