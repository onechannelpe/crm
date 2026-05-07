import type { UpdateCadence, UpdateKind } from "~/lib/updates/types";

export function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function buildUpdateId(
  date: string,
  kind: UpdateKind,
  cadence: UpdateCadence,
  title: string,
): string {
  return `${date}:${kind}:${cadence}:${slugifyTitle(title)}`;
}
