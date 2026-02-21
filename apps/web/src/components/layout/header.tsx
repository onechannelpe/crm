import { useLocation } from "@solidjs/router";
import type { JSX } from "solid-js";

import CircleQuestionMark from "~/components/icons/circle-question-mark";
import House from "~/components/icons/house";
import MessageSquare from "~/components/icons/message-square";
import Package from "~/components/icons/package";
import Search from "~/components/icons/search";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import Users from "~/components/icons/users";
import { HeaderNotificationsPanel } from "~/components/layout/header-notifications-panel";
import { HeaderSearchPanel } from "~/components/layout/header-search-panel";
import { useSession } from "~/components/providers/session-provider";
import { Button } from "~/components/ui/input/button";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";

const ROUTE_LABELS: Record<
  string,
  { label: string; icon: (props: { class?: string }) => JSX.Element }
> = {
  dashboard: { label: "Opportunities", icon: MessageSquare },
  leads: { label: "Opportunities", icon: MessageSquare },
  "client-search": { label: "Search", icon: Search },
  quota: { label: "Dashboards", icon: Package },
  validation: { label: "Tasks", icon: ShieldCheck },
  audit: { label: "Notes", icon: MessageSquare },
  inventory: { label: "Companies", icon: House },
  team: { label: "People", icon: Users },
  settings: { label: "Settings", icon: Settings },
  profile: { label: "Profile", icon: Users },
  sales: { label: "Workflows", icon: MessageSquare },
};

export function Header() {
  const { currentUser } = useSession();
  const location = useLocation();
  const currentRoute = () => {
    const segments = location.pathname.split("/").filter(Boolean);
    const segment = segments[0] ?? "dashboard";
    if (segment === "client-search") {
      const subSegment = segments[1];
      if (subSegment === "companies") {
        return { label: "Companies", icon: House };
      }
      if (subSegment === "people") {
        return { label: "People", icon: Users };
      }
      return ROUTE_LABELS["client-search"];
    }
    return ROUTE_LABELS[segment] ?? { label: "Workspace", icon: MessageSquare };
  };
  return (
    <header
      class="sticky top-0 bg-background"
      style={{ "z-index": DS_Z_INDEX.sticky }}
    >
      <div class="mx-auto flex h-[var(--tw-top-bar-height)] w-full max-w-[1800px] items-center justify-between pl-[var(--tw-top-bar-left-offset)] pr-[var(--tw-top-bar-right-offset)]">
        <div class="flex items-center gap-2 text-[13px] text-foreground">
          {(() => {
            const Icon = currentRoute().icon;
            return <Icon class="h-4 w-4 text-muted-foreground" />;
          })()}
          <span class="font-medium">{currentRoute().label}</span>
        </div>

        <div class="flex items-center gap-[var(--tw-between-siblings-gap)]">
          <Button variant="outline" size="sm" class="h-7 gap-1.5 text-[13px]">
            + New record
          </Button>
          <Button variant="ghost" size="sm" class="h-7 px-2 text-[13px]">
            : | Ctrl K
          </Button>
          <HeaderSearchPanel role={currentUser().role} />
          <HeaderNotificationsPanel />
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground md:hidden"
          >
            <CircleQuestionMark class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
