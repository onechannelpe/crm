import { useLocation } from "@solidjs/router";
import type { Component } from "solid-js";

import CircleQuestionMark from "~/components/icons/circle-question-mark";
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
import { cn } from "~/lib/utils";

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

  return (
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
            class={cn(styles.topbarGhost, styles.topbarOutline)}
            type="button"
          >
            + New record
          </button>
          <button class={styles.topbarGhost} type="button">
            : | Ctrl K
          </button>
          <HeaderNotificationsPanel />
          <button class={styles.topbarGhost} type="button" aria-label="Help">
            <CircleQuestionMark size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
