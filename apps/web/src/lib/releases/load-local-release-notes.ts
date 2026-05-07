import type { Component } from "solid-js";

import {
  type LocalReleaseNote,
  type ReleaseChannel,
  validReleaseChannels,
} from "~/lib/releases/types";

type ReleaseFrontmatter = {
  release?: unknown;
  date?: unknown;
  Date?: unknown;
  channel?: unknown;
};

type ReleaseModule = {
  default: Component;
  frontmatter?: unknown;
};

const releaseModules = import.meta.glob<ReleaseModule>(
  "../../../content/releases/*.md",
  { eager: true },
);

function getReleaseSlug(path: string): string {
  const match = path.match(/\/([^/]+)\.md$/);
  if (!match) {
    throw new Error(`Invalid release content path: ${path}`);
  }

  return match[1];
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeFrontmatterDate(value: unknown): string | undefined {
  if (isIsoDate(value)) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return undefined;
}

function normalizeChannel(value: unknown): ReleaseChannel | undefined {
  if (typeof value !== "string") return undefined;
  return validReleaseChannels.find((channel) => channel === value);
}

function parseVersionParts(input: string): [number, number, number] | null {
  const normalized = input.trim().replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if ([major, minor, patch].some((n) => Number.isNaN(n))) {
    return null;
  }

  return [major, minor, patch];
}

function compareSemanticVersions(left: string, right: string): number {
  const l = parseVersionParts(left);
  const r = parseVersionParts(right);

  if (!l && !r) return 0;
  if (!l) return -1;
  if (!r) return 1;

  if (l[0] !== r[0]) return l[0] - r[0];
  if (l[1] !== r[1]) return l[1] - r[1];
  return l[2] - r[2];
}

function parseRelease(
  path: string,
  module: ReleaseModule,
): LocalReleaseNote | null {
  const releaseValue = getFrontmatterValue(module.frontmatter, "release");
  const release = typeof releaseValue === "string" ? releaseValue.trim() : "";

  if (!release) {
    console.warn(
      `[releases] skipping ${path}: missing required frontmatter "release"`,
    );
    return null;
  }

  const note: LocalReleaseNote = {
    slug: getReleaseSlug(path),
    release,
    content: module.default,
  };

  const rawDate =
    getFrontmatterValue(module.frontmatter, "Date") ??
    getFrontmatterValue(module.frontmatter, "date");
  const normalizedDate = normalizeFrontmatterDate(rawDate);
  if (normalizedDate) {
    note.date = normalizedDate;
  } else if (rawDate != null) {
    console.warn(
      `[releases] invalid "date" in ${path}; expected YYYY-MM-DD or Date`,
    );
  }

  const channelValue = getFrontmatterValue(module.frontmatter, "channel");
  const channel = normalizeChannel(channelValue);
  if (channel) {
    note.channel = channel;
  } else if (channelValue != null) {
    console.warn(`[releases] ignoring invalid "channel" in ${path}`);
  }

  return note;
}

export function loadLocalReleaseNotesResult() {
  const notes = Object.entries(releaseModules)
    .map(([path, module]) => parseRelease(path, module))
    .filter((note): note is LocalReleaseNote => note !== null)
    .toSorted((left, right) =>
      compareSemanticVersions(right.release, left.release),
    );

  return {
    notes,
    skippedCount: Object.keys(releaseModules).length - notes.length,
  };
}

export function loadLocalReleaseNotes(): LocalReleaseNote[] {
  return loadLocalReleaseNotesResult().notes;
}

export function getLocalReleaseNotesWarningsCount(): number {
  return loadLocalReleaseNotesResult().skippedCount;
}
function getFrontmatterValue(
  frontmatter: unknown,
  key: keyof ReleaseFrontmatter,
): unknown {
  if (typeof frontmatter !== "object" || frontmatter === null) return undefined;
  return Reflect.get(frontmatter, key);
}
