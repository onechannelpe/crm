import { type ParentProps } from "solid-js";

import { cn } from "~/shared/classnames";

import { useIsSettingsDrawer } from "../hooks/use-is-settings-drawer";

import styles from "./navigation-drawer-shell.module.css";

export function NavigationDrawerScrollableContent(props: ParentProps) {
  const isSettingsDrawer = useIsSettingsDrawer();

  return (
    <div
      class={cn(
        styles.scrollable,
        isSettingsDrawer() && styles.scrollableSettings,
      )}
    >
      {props.children}
    </div>
  );
}
