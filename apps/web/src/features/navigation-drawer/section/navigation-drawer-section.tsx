import type { ParentProps } from "solid-js";

import { cn } from "~/shared/classnames";

import { useIsSettingsDrawer } from "../hooks/use-is-settings-drawer";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

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
          width:
            isMobile() || isSettingsDrawer()
              ? "100%"
              : "calc(100% - var(--spacing-2))",
        }}
      >
        {props.children}
      </div>
    </section>
  );
}
