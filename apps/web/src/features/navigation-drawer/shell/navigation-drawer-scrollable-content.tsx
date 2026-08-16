import { clsx } from "clsx";
import { type ParentProps } from "solid-js";

import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

import styles from "./navigation-drawer-shell.module.css";

export function NavigationDrawerScrollableContent(props: ParentProps) {
  const { isMobile } = useNavigationDrawerState();

  return (
    <div class={clsx(styles.scrollable, isMobile() && styles.scrollableMobile)}>
      {props.children}
    </div>
  );
}
