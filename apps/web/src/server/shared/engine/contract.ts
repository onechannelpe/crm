// GENERATED FILE. DO NOT EDIT.
export const ENGINE_API_VERSION = "v1";
export const ENGINE_API_PREFIX = `/${ENGINE_API_VERSION}`;
export const ENGINE_ENDPOINTS = {
  search: "/search",
  health: "/health",
} as const;
export function engineApiPath(
  endpoint: (typeof ENGINE_ENDPOINTS)[keyof typeof ENGINE_ENDPOINTS],
): string {
  return `${ENGINE_API_PREFIX}${endpoint}`;
}
