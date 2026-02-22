import { useLocation } from "@solidjs/router";
import { createSignal, onCleanup, onMount, type Component } from "solid-js";

import { CommandPalette } from "~/components/features/command-palette/command-palette";
import House from "~/components/icons/house";
import MessageSquare from "~/components/icons/message-square";
import Package from "~/components/icons/package";
import Search from "~/components/icons/search";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import Users from "~/components/icons/users";
import { HeaderNotificationsPanel } from "~/components/layout/header-notifications-panel";
import { getHeaderRoute } from "~/lib/auth/access/route-policy";
import type { RouteIcon } from "~/lib/auth/access/route-policy-data";

import styles from "./shell.module.css";

const ICON_BY_ROUTE: Record<
  RouteIcon,
  Component<{ class?: string; size?: string | number }>
> = {
  search: Search,
  settings: Settings,
  people: Users,
  companies: House,
  opportunities: MessageSquare,
  tasks: ShieldCheck,
  notes: MessageSquare,
  dashboards: Package,
  profile: Users,
  workflows: MessageSquare,
};

export function Header() {
  const location = useLocation();
  const currentRoute = () => getHeaderRoute(location.pathname);
  const [paletteOpen, setPaletteOpen] = createSignal(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setPaletteOpen(true);
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
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
            >
              : | Ctrl K
            </button>
            <HeaderNotificationsPanel />
          </div>
        </div>
      </header>
    </>
  );
}
