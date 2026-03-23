import { type ParentProps } from "solid-js";

import { cn } from "~/lib/utils";

import { useIsSettingsDrawer } from "../hooks/use-is-settings-drawer";
import { NavigationDrawerSection } from "../section/navigation-drawer-section";

import styles from "../navigation-drawer.module.css";

export function NavigationDrawerFixedContent(props: ParentProps) {
  const isSettingsDrawer = useIsSettingsDrawer();

  return (
    <div
      class={cn(
        styles.fixedContent,
        isSettingsDrawer() && styles.fixedContentSettings,
      )}
    >
      <NavigationDrawerSection>{props.children}</NavigationDrawerSection>
    </div>
  );
}
