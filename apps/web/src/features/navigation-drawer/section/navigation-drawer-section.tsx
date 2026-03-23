import type { ParentProps } from "solid-js";

import { cn } from "~/lib/utils";

import { useIsSettingsDrawer } from "../hooks/use-is-settings-drawer";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";

import styles from "./navigation-drawer-section.module.css";

interface NavigationDrawerSectionProps extends ParentProps {
  class?: string;
}

export function NavigationDrawerSection(props: NavigationDrawerSectionProps) {
  const { isMobile } = useNavigationDrawerState();
  const isSettingsDrawer = useIsSettingsDrawer();

  return (
    <section
      class={cn(
        styles.section,
        isSettingsDrawer() && styles.sectionSettings,
        props.class,
      )}
    >
      <div
        class={styles.sectionInner}
        style={{
          width: isMobile() || isSettingsDrawer() ? "100%" : "calc(100% - 8px)",
        }}
      >
        {props.children}
      </div>
    </section>
  );
}
