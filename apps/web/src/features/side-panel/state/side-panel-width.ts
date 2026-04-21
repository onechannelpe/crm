import {
  clampPanelWidthToConstraints,
  persistPanelWidthToCookie,
  readPanelWidthFromCookie,
} from "~/components/ui/layout/resizable-panel/panel-width-persistence";

const SIDE_PANEL_WIDTH_COOKIE = "side_panel_width";
const SIDE_PANEL_WIDTH_MIN = 320;
const SIDE_PANEL_WIDTH_MAX = 600;
const SIDE_PANEL_WIDTH_DEFAULT = 400;
const SIDE_PANEL_WIDTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function readSidePanelWidthFromCookie(): number {
  return readPanelWidthFromCookie({
    cookieName: SIDE_PANEL_WIDTH_COOKIE,
    maxAgeSeconds: SIDE_PANEL_WIDTH_MAX_AGE_SECONDS,
    constraints: SIDE_PANEL_WIDTH_CONSTRAINTS,
  });
}

export function persistSidePanelWidthToCookie(width: number): number {
  return persistPanelWidthToCookie(width, {
    cookieName: SIDE_PANEL_WIDTH_COOKIE,
    maxAgeSeconds: SIDE_PANEL_WIDTH_MAX_AGE_SECONDS,
    constraints: SIDE_PANEL_WIDTH_CONSTRAINTS,
  });
}

export function clampSidePanelWidth(width: number): number {
  return clampPanelWidthToConstraints(width, SIDE_PANEL_WIDTH_CONSTRAINTS);
}

export const SIDE_PANEL_WIDTH_VAR = "--side-panel-width";

export const SIDE_PANEL_WIDTH_CONSTRAINTS = {
  min: SIDE_PANEL_WIDTH_MIN,
  max: SIDE_PANEL_WIDTH_MAX,
  default: SIDE_PANEL_WIDTH_DEFAULT,
} as const;
