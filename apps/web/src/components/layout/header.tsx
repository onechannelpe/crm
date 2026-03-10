import { useLocation } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

import { CommandPalette } from "~/components/features/command-palette/command-palette";
import { HeaderNotificationsPanel } from "~/components/layout/header-notifications-panel";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { useHotkey } from "~/lib/hotkey/use-hotkey";
import { getHeaderRoute } from "~/lib/nav/nav-policy";

import styles from "./shell.module.css";

export function Header() {
  const location = useLocation();
  const currentRoute = createMemo(() => getHeaderRoute(location.pathname));
  const [paletteOpen, setPaletteOpen] = createSignal(false);

  useHotkey("Mod+K", () => setPaletteOpen(true));

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
