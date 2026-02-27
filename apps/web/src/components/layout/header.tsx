import { useLocation } from "@solidjs/router";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";

import { CommandPalette } from "~/components/features/command-palette/command-palette";
import { HeaderNotificationsPanel } from "~/components/layout/header-notifications-panel";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { getHeaderRoute } from "~/lib/nav/nav-policy";

import styles from "./shell.module.css";

export function Header() {
  const location = useLocation();
  const currentRoute = createMemo(() => getHeaderRoute(location.pathname));
  const [paletteOpen, setPaletteOpen] = createSignal(false);

  createEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    onCleanup(() => document.removeEventListener("keydown", handler));
  });

  return (
    <>
      <CommandPalette
        open={paletteOpen()}
        onClose={() => setPaletteOpen(false)}
      />
      <header class={styles.topbar}>
        <div class={styles.topbarInner}>
          <div class={styles.topbarTitle}>
            {(() => {
              const Icon = ICON_BY_ROUTE[currentRoute().icon];
              return <Icon size={16} />;
            })()}
            <span>{currentRoute().label}</span>
          </div>
          <div class={styles.topbarActions}>
            <button
              class={styles.topbarGhost}
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Abrir lista de comandos"
            >
              <span class={styles.topbarKbd}>Ctrl</span>
              <span class={styles.topbarKbd}>K</span>
            </button>
            <HeaderNotificationsPanel />
          </div>
        </div>
      </header>
    </>
  );
}
