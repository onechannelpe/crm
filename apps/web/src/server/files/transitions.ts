import type { ArtifactStatus } from "./types";

const VALID_TRANSITIONS: ReadonlyMap<
  ArtifactStatus,
  ReadonlySet<ArtifactStatus>
> = new Map([
  [
    "requested",
    new Set<ArtifactStatus>(["receiving", "ready", "failed", "revoked"]),
  ],
  ["receiving", new Set<ArtifactStatus>(["validating", "failed"])],
  ["validating", new Set<ArtifactStatus>(["scanning", "failed"])],
  ["scanning", new Set<ArtifactStatus>(["ready", "failed"])],
  [
    "ready",
    new Set<ArtifactStatus>(["processing", "completed", "expired", "revoked"]),
  ],
  ["processing", new Set<ArtifactStatus>(["completed", "failed"])],
  ["completed", new Set<ArtifactStatus>(["expired"])],
  ["failed", new Set<ArtifactStatus>()],
  ["expired", new Set<ArtifactStatus>()],
  ["revoked", new Set<ArtifactStatus>()],
]);

export function isValidTransition(
  from: ArtifactStatus,
  to: ArtifactStatus,
): boolean {
  return VALID_TRANSITIONS.get(from)?.has(to) ?? false;
}

export function assertValidTransition(
  from: ArtifactStatus,
  to: ArtifactStatus,
): void {
  if (!isValidTransition(from, to)) {
    throw new Error(`Invalid artifact status transition: ${from} -> ${to}`);
  }
}
