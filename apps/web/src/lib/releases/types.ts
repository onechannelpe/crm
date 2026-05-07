import type { Component } from "solid-js";

export const validReleaseChannels = [
  "alpha",
  "beta",
  "nightly",
  "stable",
] as const;

export type ReleaseChannel = (typeof validReleaseChannels)[number];

export type LocalReleaseNote = {
  slug: string;
  release: string;
  content: Component;
  date?: string;
  channel?: ReleaseChannel;
};
