import { useLocation, useNavigate } from "@solidjs/router";
import { createMemo } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import Search from "~/components/icons/search";
import Settings from "~/components/icons/settings";
import { useSession } from "~/components/providers/session-provider";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { cn } from "~/lib/utils";

import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { useOpenSettingsMenu } from "../hooks/use-open-settings-menu";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

import styles from "./mobile-navigation-bar.module.css";

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
    memorizeNavigationState,
  } = useNavigationDrawerState();
  const isSettingsPage = useIsSettingsPage();
  const { openSettingsMenu } = useOpenSettingsMenu();

  const activeItemName = createMemo(() => {
    if (!expanded()) {
      return "main";
    }

    return currentMobileDrawer();
  });

  if (!isMobile()) {
    return null;
  }

  return (
    <nav class={styles.mobileBar}>
      <button
        type="button"
        class={cn(
          styles.mobileBarItem,
          activeItemName() === "main" && styles.mobileBarItemActive,
        )}
        onClick={() => {
          setCurrentMobileDrawer("main");
          setExpanded((previous) => activeItemName() !== "main" || !previous);

          if (isSettingsPage()) {
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
          activeItemName() === "settings" && styles.mobileBarItemActive,
        )}
        onClick={() => {
          memorizeNavigationState(
            location.pathname + location.search,
            expanded(),
          );
          openSettingsMenu();

          if (!isSettingsPage()) {
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
