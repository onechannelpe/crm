import type { ParentProps } from "solid-js";

import styles from "./navigation-drawer-item.module.css";

export function NavigationDrawerItemGroup(props: ParentProps) {
  return <div class={styles.itemGroup}>{props.children}</div>;
}
