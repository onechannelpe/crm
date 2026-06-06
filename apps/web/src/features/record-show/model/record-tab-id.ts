// One tab-id type for every record surface. Which ids actually appear is decided
// per context by the registry's `appearsIn` predicate, not by separate id unions.
export type RecordTabId = "home" | "workflow" | "activity" | "files" | "data";
