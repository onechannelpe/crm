import { createMemo } from "solid-js";

import { useNavigationDrawerState } from "../state/navigation-drawer-state";
import { useIsSettingsPage } from "./use-is-settings-page";

export function useIsSettingsDrawer() {
  const { isMobile, currentMobileDrawer } = useNavigationDrawerState();
  const isSettingsPage = useIsSettingsPage();

  return createMemo(() =>
    isMobile() ? currentMobileDrawer() === "settings" : isSettingsPage(),
  );
}
