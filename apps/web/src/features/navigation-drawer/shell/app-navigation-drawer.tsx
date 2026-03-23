import { createEffect } from "solid-js";

import { useIsSettingsDrawer } from "../hooks/use-is-settings-drawer";
import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { MobileNavigationBar } from "../mobile/mobile-navigation-bar";
import { SettingsNavigationDrawer } from "../settings/settings-navigation-drawer";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";
import { MainNavigationDrawer } from "./main-navigation-drawer";

export function AppNavigationDrawer() {
  const isSettingsDrawer = useIsSettingsDrawer();
  const isSettingsPage = useIsSettingsPage();
  const { isMobile, setCurrentMobileDrawer, expanded, setExpanded } =
    useNavigationDrawerState();

  createEffect(() => {
    if (isMobile()) {
      if (isSettingsPage()) {
        setCurrentMobileDrawer("settings");
      }
      return;
    }

    if (isSettingsPage() && !expanded()) {
      setExpanded(true);
    }
  });

  return (
    <>
      {isSettingsDrawer() ? (
        <SettingsNavigationDrawer />
      ) : (
        <MainNavigationDrawer />
      )}
      <MobileNavigationBar />
    </>
  );
}
