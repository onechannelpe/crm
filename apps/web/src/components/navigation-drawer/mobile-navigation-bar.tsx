import { useNavigate } from "@solidjs/router";

import ChevronRight from "~/components/icons/chevron-right";
import Search from "~/components/icons/search";
import { cn } from "~/lib/utils";

import { useNavigationDrawerState } from "./navigation-drawer-state";

import styles from "./navigation-drawer.module.css";

export function MobileNavigationBar() {
  const navigate = useNavigate();
  const {
    expanded,
    setExpanded,
    currentMobileDrawer,
    setCurrentMobileDrawer,
    isMobile,
  } = useNavigationDrawerState();

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
            (current) => !current || currentMobileDrawer() !== "main",
          );
        }}
        aria-label="Abrir navegación"
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
          setCurrentMobileDrawer("settings");
          setExpanded(true);
        }}
        aria-label="Abrir ajustes"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
