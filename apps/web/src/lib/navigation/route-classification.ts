export function isSettingsRoutePath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

export function isRecordShowPath(pathname: string): boolean {
  return /^\/leads\/\d+$/.test(pathname);
}
