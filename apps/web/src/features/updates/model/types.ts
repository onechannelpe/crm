import type { Component } from "solid-js";

const updateKinds = ["release", "technical"] as const;
export type UpdateKind = (typeof updateKinds)[number];

const updateCadences = ["nightly", "weekly", "none"] as const;
export type UpdateCadence = (typeof updateCadences)[number];

const updateVisibilities = ["internal"] as const;
export type UpdateVisibility = (typeof updateVisibilities)[number];

const updateFilters = [
  "all",
  "technical",
  "release-nightly",
  "release-weekly",
] as const;
export type UpdateFilter = (typeof updateFilters)[number];

export type UpdateFrontmatterInput = {
  title?: unknown;
  date?: unknown;
  kind?: unknown;
  cadence?: unknown;
  visibility?: unknown;
  tags?: unknown;
};

export type UpdateEntry = {
  id: string;
  slug: string;
  title: string;
  date: string;
  kind: UpdateKind;
  cadence: UpdateCadence;
  visibility: UpdateVisibility;
  tags: string[];
  content: Component;
};

export type UpdateFilterOption = {
  label: string;
  value: UpdateFilter;
};
