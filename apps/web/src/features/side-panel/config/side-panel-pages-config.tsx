import type { Component } from "solid-js";
import type { SidePanelPageKey } from "../state/side-panel-store";
import { SidePanelRootPage } from "../pages/root/side-panel-root-page";

export const SIDE_PANEL_PAGES_CONFIG = new Map<SidePanelPageKey, Component>([
  ["root", SidePanelRootPage],
]);
