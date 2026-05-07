import type { LocalReleaseNote } from "~/lib/releases/types";

function parseVersionNumber(version: string): number | null {
  const normalized = version.trim().replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if ([major, minor, patch].some((n) => Number.isNaN(n))) {
    return null;
  }

  return major * 1_000_000 + minor * 1_000 + patch;
}

export function getVisibleReleaseNotes(
  notes: LocalReleaseNote[],
  latestPublishedTag: string | null,
): LocalReleaseNote[] {
  if (!latestPublishedTag) {
    return [];
  }

  const publishedNumber = parseVersionNumber(latestPublishedTag);
  if (publishedNumber === null) {
    return [];
  }

  return notes.filter((note) => {
    const noteNumber = parseVersionNumber(note.release);
    if (noteNumber === null) {
      return false;
    }

    return noteNumber <= publishedNumber;
  });
}
