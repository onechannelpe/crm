import type { ParentProps } from "solid-js";

import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

import styles from "./navigation-drawer-item.module.css";

interface NavigationDrawerItemsCollapsableContainerProps extends ParentProps {
  isGroup?: boolean;
}

export function NavigationDrawerItemsCollapsableContainer(
  props: NavigationDrawerItemsCollapsableContainerProps,
) {
  const { expanded } = useNavigationDrawerState();
  const isSettingsPage = useIsSettingsPage();
  const isExpanded = () => expanded() || isSettingsPage();

  return (
    <div
      class={styles.collapseWrapper}
      style={{
        width: isExpanded() ? "auto" : "var(--spacing-6)",
        "background-color":
          !isExpanded() && props.isGroup
            ? "var(--background-transparent-lighter)"
            : "transparent",
        border:
          !isExpanded() && props.isGroup
            ? "1px solid var(--background-transparent-lighter)"
            : "none",
        "border-radius":
          !isExpanded() && props.isGroup ? "var(--radius-md)" : undefined,
        transition:
          "width var(--motion-normal) var(--ease-standard), background-color var(--motion-normal) var(--ease-standard), border var(--motion-normal) var(--ease-standard)",
      }}
    >
      {props.children}
    </div>
  );
}
