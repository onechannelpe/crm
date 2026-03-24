import type { Component } from "solid-js";

import { SidePanelRootPage } from "../pages/root/side-panel-root-page";
import type { SidePanelPageKey } from "../state/side-panel-store";

export const SIDE_PANEL_PAGES_CONFIG = new Map<SidePanelPageKey, Component>([
  ["root", SidePanelRootPage],
]);
