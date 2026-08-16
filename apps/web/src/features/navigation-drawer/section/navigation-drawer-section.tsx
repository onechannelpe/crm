import { clsx } from "clsx";
import type { ParentProps } from "solid-js";

import { useIsSettingsDrawer } from "../hooks/use-is-settings-drawer";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

import styles from "./navigation-drawer-section.module.css";

export function NavigationDrawerSection(
  props: ParentProps<{ class?: string }>,
) {
  const { isMobile, expanded } = useNavigationDrawerState();
  const isSettingsDrawer = useIsSettingsDrawer();

  const isMainNavCollapsed = () =>
    !isSettingsDrawer() && !isMobile() && !expanded();
  const fullWidth = () => isMobile() || isMainNavCollapsed();

  return (
    <section
      class={clsx(
        styles.section,
        isSettingsDrawer() && styles.sectionSettings,
        props.class,
      )}
    >
      <div
        class={styles.sectionInner}
        style={{
          width: fullWidth() ? "100%" : "calc(100% - var(--spacing-2))",
        }}
      >
        {props.children}
      </div>
    </section>
  );
}
