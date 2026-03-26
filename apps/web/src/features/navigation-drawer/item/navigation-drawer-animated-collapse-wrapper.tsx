import type { ParentProps } from "solid-js";

import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

export function NavigationDrawerAnimatedCollapseWrapper(props: ParentProps) {
  const isSettingsPage = useIsSettingsPage();
  const { expanded } = useNavigationDrawerState();

  if (isSettingsPage()) {
    return <>{props.children}</>;
  }

  return (
    <span
      style={{
        display: "block",
        opacity: expanded() ? "1" : "0",
        width: expanded() ? "auto" : "0",
        height: expanded() ? "auto" : "0",
        "pointer-events": expanded() ? "auto" : "none",
        overflow: "hidden",
        transition:
          "opacity var(--motion-normal) var(--ease-standard), width var(--motion-normal) var(--ease-standard), height var(--motion-normal) var(--ease-standard)",
      }}
    >
      {props.children}
    </span>
  );
}
