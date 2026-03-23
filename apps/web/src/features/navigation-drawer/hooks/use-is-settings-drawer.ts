import { createMemo } from "solid-js";

import { useIsSettingsPage } from "./use-is-settings-page";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";

export function useIsSettingsDrawer() {
  const { isMobile, currentMobileDrawer } = useNavigationDrawerState();
  const isSettingsPage = useIsSettingsPage();

  return createMemo(() =>
    isMobile() ? currentMobileDrawer() === "settings" : isSettingsPage(),
  );
}
