export function isSettingsRoutePath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

export function isRecordShowPath(pathname: string): boolean {
  return /^\/records\/[^/]+$/.test(pathname);
}

export function isDashboardDetailPath(pathname: string): boolean {
  return /^\/dashboards\/[^/]+$/.test(pathname);
}
