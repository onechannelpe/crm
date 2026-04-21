import {
  persistPanelWidthToCookie,
  readPanelWidthFromCookie,
} from "~/components/ui/layout/resizable-panel/panel-width-persistence";

const NAVIGATION_DRAWER_WIDTH_COOKIE = "navigation_drawer_width";
const NAVIGATION_DRAWER_WIDTH_MIN = 180;
const NAVIGATION_DRAWER_WIDTH_MAX = 350;
const NAVIGATION_DRAWER_WIDTH_DEFAULT = 220;
const NAVIGATION_DRAWER_WIDTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const NAVIGATION_DRAWER_WIDTH_VAR = "--navigation-drawer-width";
export const NAVIGATION_DRAWER_COLLAPSED_WIDTH_PX = 40;

export function readNavigationDrawerWidthFromCookie(): number {
  return readPanelWidthFromCookie({
    cookieName: NAVIGATION_DRAWER_WIDTH_COOKIE,
    maxAgeSeconds: NAVIGATION_DRAWER_WIDTH_MAX_AGE_SECONDS,
    constraints: NAVIGATION_DRAWER_WIDTH_CONSTRAINTS,
  });
}

export function persistNavigationDrawerWidthToCookie(width: number): number {
  return persistPanelWidthToCookie(width, {
    cookieName: NAVIGATION_DRAWER_WIDTH_COOKIE,
    maxAgeSeconds: NAVIGATION_DRAWER_WIDTH_MAX_AGE_SECONDS,
    constraints: NAVIGATION_DRAWER_WIDTH_CONSTRAINTS,
  });
}

export const NAVIGATION_DRAWER_WIDTH_CONSTRAINTS = {
  min: NAVIGATION_DRAWER_WIDTH_MIN,
  max: NAVIGATION_DRAWER_WIDTH_MAX,
  default: NAVIGATION_DRAWER_WIDTH_DEFAULT,
} as const;
