export function isSettingsRoutePath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}
