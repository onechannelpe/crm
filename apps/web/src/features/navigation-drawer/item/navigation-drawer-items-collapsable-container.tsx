import type { ParentProps } from "solid-js";

import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

import styles from "./navigation-drawer-item.module.css";

export function NavigationDrawerItemsCollapsableContainer(
  props: ParentProps<{
    isGroup?: boolean;
  }>,
) {
  const { expanded } = useNavigationDrawerState();
  const isSettingsPage = useIsSettingsPage();

  const isExpanded = () => expanded() || isSettingsPage();
  const isCollapsedGroup = () => !isExpanded() && props.isGroup === true;

  return (
    <div
      class={styles.collapseWrapper}
      style={{
        width: isExpanded() ? "auto" : "var(--spacing-6)",
        "background-color": isCollapsedGroup()
          ? "var(--background-transparent-lighter)"
          : "transparent",
        border: isCollapsedGroup()
          ? "1px solid var(--background-transparent-lighter)"
          : "none",
        "border-radius": isCollapsedGroup() ? "var(--radius-md)" : undefined,
        transition:
          "width var(--motion-normal) var(--ease-standard), background-color var(--motion-normal) var(--ease-standard), border var(--motion-normal) var(--ease-standard)",
      }}
    >
      {props.children}
    </div>
  );
}
