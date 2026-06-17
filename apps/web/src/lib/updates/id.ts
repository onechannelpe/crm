import type { UpdateCadence, UpdateKind } from "~/lib/updates/types";

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
