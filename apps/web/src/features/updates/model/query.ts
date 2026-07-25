import type { UpdateEntry, UpdateFilter } from "~/features/updates/model/types";

export function queryUpdates(
  updates: readonly UpdateEntry[],
  filter: UpdateFilter,
): readonly UpdateEntry[] {
  if (filter === "all") return updates;
  if (filter === "technical") {
    return updates.filter((entry) => entry.kind === "technical");
  }
  if (filter === "release-nightly") {
    return updates.filter(
      (entry) => entry.kind === "release" && entry.cadence === "nightly",
    );
  }
  if (filter === "release-weekly") {
    return updates.filter(
      (entry) => entry.kind === "release" && entry.cadence === "weekly",
    );
  }

  filter satisfies never;
  return updates;
}
