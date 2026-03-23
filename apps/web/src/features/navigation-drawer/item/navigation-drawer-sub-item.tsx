import type { NavigationDrawerItemProps } from "./navigation-drawer-item";
import { NavigationDrawerItem } from "./navigation-drawer-item";

export function NavigationDrawerSubItem(props: NavigationDrawerItemProps) {
  return <NavigationDrawerItem {...props} indentationLevel={2} />;
}
