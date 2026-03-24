export {
  NAVIGATION_DRAWER_CLICK_OUTSIDE_ID,
  PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID,
  SIDE_PANEL_CLICK_OUTSIDE_ID,
} from "./constants/side-panel-click-outside-id";
export { SIDE_PANEL_HOTKEY } from "./constants/side-panel-hotkey";
export { MainContainerWithSidePanel } from "./shell/main-container-with-side-panel";
export {
  createRootSidePanelPage,
  type SidePanelPage,
  type SidePanelPageInfo,
  type SidePanelPageKey,
} from "./state/side-panel-store";
export { SidePanelProvider, useSidePanel } from "./state/use-side-panel";
