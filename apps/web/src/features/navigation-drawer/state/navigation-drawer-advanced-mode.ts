import {
  booleanUiPreferenceCookieCodec,
  defineUiPreferenceCookie,
} from "~/browser/ui/ui-preference-cookie";

const NAVIGATION_DRAWER_ADVANCED_MODE_COOKIE =
  "navigation_drawer_advanced_mode";
const NAVIGATION_DRAWER_ADVANCED_MODE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const navigationDrawerAdvancedModeCookie = defineUiPreferenceCookie({
  name: NAVIGATION_DRAWER_ADVANCED_MODE_COOKIE,
  maxAgeSeconds: NAVIGATION_DRAWER_ADVANCED_MODE_MAX_AGE_SECONDS,
  codec: booleanUiPreferenceCookieCodec,
});
