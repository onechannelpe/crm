export function settingsItemMatchesPath(
  pathname: string,
  href?: string,
  matchSubPages?: boolean,
) {
  if (!href) {
    return false;
  }

  if (matchSubPages === false) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
