import { useLocation } from "@solidjs/router";
import { createMemo, createSignal, onMount } from "solid-js";

import { CommandPalette } from "~/components/features/command-palette/command-palette";
import { ExtensionStatusIndicator } from "~/components/features/extension/extension-status-indicator";
import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { HeaderNotificationsPanel } from "~/components/layout/header-notifications-panel";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { TopBarCommandButton } from "~/components/layout/top-bar-command-button";
import { useNavigationDrawerState } from "~/features/navigation-drawer";
import { PageHeader } from "~/features/settings-shell";
import { createExtensionPortConnection } from "~/lib/extension/port";
import { useHotkey } from "~/lib/hotkey/use-hotkey";
import { getHeaderRoute } from "~/lib/nav/nav-policy";

import styles from "./header.module.css";

interface ChromeRuntime {
  sendMessage: (message: unknown, callback?: () => void) => void;
}

export function Header() {
  const location = useLocation();
  const currentRoute = createMemo(() => getHeaderRoute(location.pathname));
  const [paletteOpen, setPaletteOpen] = createSignal(false);
  const [modKey, setModKey] = createSignal("Ctrl");
  const { expanded, isMobile, setExpanded } = useNavigationDrawerState();
  const { state: extensionState, error: extensionError } =
    createExtensionPortConnection();

  onMount(() => {
    if (/Mac/i.test(navigator.platform)) setModKey("⌘");
  });

  useHotkey("Mod+K", () => setPaletteOpen(true));

  const handleExtensionIndicatorClick = () => {
    // Focus extension window if available.
    const runtime =
      // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion
      (globalThis as unknown as { chrome?: { runtime: ChromeRuntime } }).chrome
        ?.runtime;

    if (runtime?.sendMessage) {
      runtime.sendMessage({ action: "focusWindow" }, () => {
        // Callback (ignore errors if extension not ready)
      });
    }
  };

  return (
    <>
      <CommandPalette
        open={paletteOpen()}
        onClose={() => setPaletteOpen(false)}
      />
      <PageHeader
        leading={
          !isMobile() && !expanded() ? (
            <button
              type="button"
              class={styles.drawerExpandButton}
              onClick={() => setExpanded(true)}
              aria-label="Expandir barra lateral"
            >
              <LayoutSidebarRightCollapse size={14} />
            </button>
          ) : undefined
        }
        icon={
          <div class={styles.iconContainer}>
            {(() => {
              const Icon = ICON_BY_ROUTE[currentRoute().icon];
              return <Icon size={16} />;
            })()}
          </div>
        }
        title={<span class={styles.routeLabel}>{currentRoute().label}</span>}
      >
        <ExtensionStatusIndicator
          extensionState={extensionState}
          extensionError={extensionError}
          onOpen={handleExtensionIndicatorClick}
        />
        <HeaderNotificationsPanel />
        <TopBarCommandButton
          isOpen={paletteOpen()}
          modKey={modKey()}
          onClick={() => setPaletteOpen((value) => !value)}
        />
      </PageHeader>
    </>
  );
}
