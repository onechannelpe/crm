import { NavigationDrawerItem } from "./navigation-drawer-item";
import type { NavigationDrawerItemProps } from "./navigation-drawer-item.types";

export function NavigationDrawerSubItem(props: NavigationDrawerItemProps) {
  return <NavigationDrawerItem {...props} indentationLevel={2} />;
}
