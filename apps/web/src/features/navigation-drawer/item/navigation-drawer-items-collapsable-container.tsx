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
        width: isExpanded() ? "auto" : "24px",
        "background-color":
          !isExpanded() && props.isGroup
            ? "var(--bg-translucent)"
            : "transparent",
        border:
          !isExpanded() && props.isGroup
            ? "1px solid var(--bg-translucent)"
            : "none",
        "border-radius": !isExpanded() && props.isGroup ? "4px" : undefined,
        transition:
          "width var(--motion-normal) var(--ease-standard), background-color var(--motion-normal) var(--ease-standard), border var(--motion-normal) var(--ease-standard)",
      }}
    >
      {props.children}
    </div>
  );
}
