import {
  persistNumberToCookie,
  readNumberFromCookie,
} from "~/components/ui/layout/resizable-panel/persistence";

const NAVIGATION_DRAWER_WIDTH_COOKIE = "navigation_drawer_width";
const NAVIGATION_DRAWER_WIDTH_MIN = 180;
const NAVIGATION_DRAWER_WIDTH_MAX = 350;
const NAVIGATION_DRAWER_WIDTH_DEFAULT = 220;
const NAVIGATION_DRAWER_WIDTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const NAVIGATION_DRAWER_WIDTH_VAR = "--navigation-drawer-width";
export const NAVIGATION_DRAWER_COLLAPSED_WIDTH_PX = 40;

function clampNavigationDrawerWidth(width: number): number {
  return Math.min(
    NAVIGATION_DRAWER_WIDTH_MAX,
    Math.max(NAVIGATION_DRAWER_WIDTH_MIN, width),
  );
}

export function readNavigationDrawerWidthFromCookie(): number {
  return readNumberFromCookie(
    NAVIGATION_DRAWER_WIDTH_COOKIE,
    NAVIGATION_DRAWER_WIDTH_DEFAULT,
    clampNavigationDrawerWidth,
  );
}

export function persistNavigationDrawerWidthToCookie(width: number): number {
  return persistNumberToCookie(
    NAVIGATION_DRAWER_WIDTH_COOKIE,
    width,
    NAVIGATION_DRAWER_WIDTH_MAX_AGE_SECONDS,
    clampNavigationDrawerWidth,
  );
}

export const NAVIGATION_DRAWER_WIDTH_CONSTRAINTS = {
  min: NAVIGATION_DRAWER_WIDTH_MIN,
  max: NAVIGATION_DRAWER_WIDTH_MAX,
  default: NAVIGATION_DRAWER_WIDTH_DEFAULT,
} as const;
