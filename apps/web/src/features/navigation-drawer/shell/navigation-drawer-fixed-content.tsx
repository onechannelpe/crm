import { clsx } from "clsx";
import { type ParentProps } from "solid-js";

import { useIsSettingsDrawer } from "../hooks/use-is-settings-drawer";
import { NavigationDrawerSection } from "../section/navigation-drawer-section";

import styles from "./navigation-drawer-shell.module.css";

export function NavigationDrawerFixedContent(props: ParentProps) {
  const isSettingsDrawer = useIsSettingsDrawer();

  return (
    <div
      class={clsx(
        styles.fixedContent,
        isSettingsDrawer() && styles.fixedContentSettings,
      )}
    >
      <NavigationDrawerSection>{props.children}</NavigationDrawerSection>
    </div>
  );
}
