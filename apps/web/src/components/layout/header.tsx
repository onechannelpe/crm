import { useLocation } from "@solidjs/router";
import { createMemo, createSignal, onMount } from "solid-js";

import { CommandPalette } from "~/components/features/command-palette/command-palette";
import { ExtensionStatusIndicator } from "~/components/features/extension/extension-status-indicator";
import { HeaderNotificationsPanel } from "~/components/layout/header-notifications-panel";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { createExtensionPortConnection } from "~/lib/extension/port";
import { useExtensionUI } from "~/lib/extension/extension-ui-context";
import { useHotkey } from "~/lib/hotkey/use-hotkey";
import { getHeaderRoute } from "~/lib/nav/nav-policy";

import styles from "./shell.module.css";

export function Header() {
  const location = useLocation();
  const currentRoute = createMemo(() => getHeaderRoute(location.pathname));
  const [paletteOpen, setPaletteOpen] = createSignal(false);
  const [modKey, setModKey] = createSignal("Ctrl");
  const { state: extensionState, error: extensionError } =
    createExtensionPortConnection();
  const { setSidebarOpen } = useExtensionUI();

  onMount(() => {
    if (/Mac/i.test(navigator.platform)) setModKey("⌘");
  });

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
              <span class={styles.topbarKbd}>{modKey()}</span>
              <span class={styles.topbarKbd}>K</span>
            </button>
            <ExtensionStatusIndicator
              extensionState={extensionState}
              extensionError={extensionError}
              onOpen={() => setSidebarOpen(true)}
            />
            <HeaderNotificationsPanel />
          </div>
        </div>
      </header>
    </>
  );
}
