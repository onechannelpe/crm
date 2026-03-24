import type { Component } from "solid-js";

export type SidePanelSubPageKey = string;

export const SIDE_PANEL_SUB_PAGES_CONFIG = new Map<
  SidePanelSubPageKey,
  Component
>();
