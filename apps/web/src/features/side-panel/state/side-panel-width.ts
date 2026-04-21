import {
  persistNumberToCookie,
  readNumberFromCookie,
} from "~/components/ui/layout/resizable-panel/persistence";

const SIDE_PANEL_WIDTH_COOKIE = "side_panel_width";
const SIDE_PANEL_WIDTH_MIN = 320;
const SIDE_PANEL_WIDTH_MAX = 600;
const SIDE_PANEL_WIDTH_DEFAULT = 400;
const SIDE_PANEL_WIDTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function clampSidePanelWidth(width: number): number {
  return Math.min(SIDE_PANEL_WIDTH_MAX, Math.max(SIDE_PANEL_WIDTH_MIN, width));
}

export function readSidePanelWidthFromCookie(): number {
  return readNumberFromCookie(
    SIDE_PANEL_WIDTH_COOKIE,
    SIDE_PANEL_WIDTH_DEFAULT,
    clampSidePanelWidth,
  );
}

export function persistSidePanelWidthToCookie(width: number): number {
  return persistNumberToCookie(
    SIDE_PANEL_WIDTH_COOKIE,
    width,
    SIDE_PANEL_WIDTH_MAX_AGE_SECONDS,
    clampSidePanelWidth,
  );
}

export const SIDE_PANEL_WIDTH_VAR = "--side-panel-width";

export const SIDE_PANEL_WIDTH_CONSTRAINTS = {
  min: SIDE_PANEL_WIDTH_MIN,
  max: SIDE_PANEL_WIDTH_MAX,
  default: SIDE_PANEL_WIDTH_DEFAULT,
} as const;
