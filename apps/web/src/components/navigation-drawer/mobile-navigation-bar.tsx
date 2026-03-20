import { useLocation, useNavigate } from "@solidjs/router";
import { createMemo } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import Search from "~/components/icons/search";
import Settings from "~/components/icons/settings";
import { useSession } from "~/components/providers/session-provider";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { cn } from "~/lib/utils";

import { useNavigationDrawerState } from "./navigation-drawer-state";

import styles from "./navigation-drawer.module.css";

export function MobileNavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const {
    expanded,
    setExpanded,
    currentMobileDrawer,
    setCurrentMobileDrawer,
    isMobile,
    setMemorizedExpanded,
    setMemorizedPath,
  } = useNavigationDrawerState();

  const isSettingsRoute = createMemo(
    () =>
      location.pathname === "/settings" ||
      location.pathname.startsWith("/settings/") ||
      location.pathname.startsWith("/admin/"),
  );

  if (!isMobile()) {
    return null;
  }

  return (
    <nav class={styles.mobileBar}>
      <button
        type="button"
        class={cn(
          styles.mobileBarItem,
          currentMobileDrawer() === "main" &&
            expanded() &&
            styles.mobileBarItemActive,
        )}
        onClick={() => {
          setCurrentMobileDrawer("main");
          setExpanded(
            (current) => currentMobileDrawer() !== "main" || !current,
          );

          if (isSettingsRoute()) {
            navigate(getDefaultAppPath(currentUser().role));
          }
        }}
        aria-label="Abrir navegacion"
      >
        <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
      </button>

      <button
        type="button"
        class={styles.mobileBarItem}
        onClick={() => {
          setExpanded(false);
          navigate("/search");
        }}
        aria-label="Buscar"
      >
        <Search size={16} />
      </button>

      <button
        type="button"
        class={cn(
          styles.mobileBarItem,
          currentMobileDrawer() === "settings" &&
            expanded() &&
            styles.mobileBarItemActive,
        )}
        onClick={() => {
          setMemorizedExpanded(expanded());
          setMemorizedPath(location.pathname + location.search);
          setCurrentMobileDrawer("settings");
          setExpanded(true);

          if (!isSettingsRoute()) {
            navigate("/settings/profile");
          }
        }}
        aria-label="Abrir ajustes"
      >
        <Settings size={16} />
      </button>
    </nav>
  );
}
