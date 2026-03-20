import { useLocation } from "@solidjs/router";
import { createEffect, createMemo } from "solid-js";

import { MainNavigationDrawer } from "./main-navigation-drawer";
import { SettingsNavigationDrawer } from "./settings-navigation-drawer";
import { useNavigationDrawerState } from "./navigation-drawer-state";

export function AppNavigationDrawer() {
  const location = useLocation();
  const { isMobile, currentMobileDrawer, setCurrentMobileDrawer } =
    useNavigationDrawerState();

  const isSettingsRoute = createMemo(
    () =>
      location.pathname === "/settings" ||
      location.pathname.startsWith("/settings/") ||
      location.pathname.startsWith("/admin/"),
  );

  createEffect(() => {
    if (!isMobile()) return;

    if (isSettingsRoute()) {
      setCurrentMobileDrawer("settings");
      return;
    }

    if (currentMobileDrawer() !== "main") {
      setCurrentMobileDrawer("main");
    }
  });

  const renderSettings = createMemo(
    () => isSettingsRoute() || (isMobile() && currentMobileDrawer() === "settings"),
  );

  return renderSettings() ? <SettingsNavigationDrawer /> : <MainNavigationDrawer />;
}
