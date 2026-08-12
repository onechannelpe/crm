import {
  booleanUiPreferenceCookieCodec,
  defineUiPreferenceCookie,
} from "~/browser/ui/ui-preference-cookie";

const NAVIGATION_DRAWER_EXPANDED_COOKIE = "navigation_drawer_expanded";
const NAVIGATION_DRAWER_EXPANDED_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const navigationDrawerExpandedCookie = defineUiPreferenceCookie({
  name: NAVIGATION_DRAWER_EXPANDED_COOKIE,
  maxAgeSeconds: NAVIGATION_DRAWER_EXPANDED_MAX_AGE_SECONDS,
  codec: booleanUiPreferenceCookieCodec,
});
