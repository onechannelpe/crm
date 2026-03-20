import { useLocation } from "@solidjs/router";
import { createEffect, createMemo } from "solid-js";

import { MainNavigationDrawer } from "./main-navigation-drawer";
import { MobileNavigationBar } from "./mobile-navigation-bar";
import { useNavigationDrawerState } from "./navigation-drawer-state";
import { SettingsNavigationDrawer } from "./settings-navigation-drawer";

export function AppNavigationDrawer() {
  const location = useLocation();
  const {
    isMobile,
    expanded,
    setExpanded,
    currentMobileDrawer,
    setCurrentMobileDrawer,
  } = useNavigationDrawerState();

  const isSettingsRoute = createMemo(
    () =>
      location.pathname === "/settings" ||
      location.pathname.startsWith("/settings/") ||
      location.pathname.startsWith("/admin/"),
  );

  createEffect(() => {
    if (isMobile()) {
      if (isSettingsRoute()) {
        setCurrentMobileDrawer("settings");
      }
      return;
    }

    if (isSettingsRoute() && !expanded()) {
      setExpanded(true);
    }
  });

  const renderSettings = createMemo(() =>
    isMobile() ? currentMobileDrawer() === "settings" : isSettingsRoute(),
  );

  return (
    <>
      {renderSettings() ? (
        <SettingsNavigationDrawer />
      ) : (
        <MainNavigationDrawer />
      )}
      <MobileNavigationBar />
    </>
  );
}
