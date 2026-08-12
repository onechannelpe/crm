import type { UpdateEntry, UpdateFilter } from "~/features/updates/model/types";

export function queryUpdates(
  updates: readonly UpdateEntry[],
  filter: UpdateFilter,
): readonly UpdateEntry[] {
  switch (filter) {
    case "all":
      return updates;

    case "technical":
      return updates.filter((entry) => entry.kind === "technical");

    case "release-nightly":
      return updates.filter(
        (entry) => entry.kind === "release" && entry.cadence === "nightly",
      );

    case "release-weekly":
      return updates.filter(
        (entry) => entry.kind === "release" && entry.cadence === "weekly",
      );

    default:
      filter satisfies never;
      return updates;
  }
}
