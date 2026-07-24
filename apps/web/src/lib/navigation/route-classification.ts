export function isSettingsRoutePath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

export function isRecordShowPath(pathname: string): boolean {
  return /^\/records\/[^/]+$/.test(pathname);
}

export function isMerchantGpvPath(pathname: string): boolean {
  return pathname === "/dashboards/merchant-gpv";
}
