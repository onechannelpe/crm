import { A, useLocation } from "@solidjs/router";
import { createMemo, For, type Component } from "solid-js";

import { logout } from "~/actions/auth-session";
import ChevronDown from "~/components/icons/chevron-down";
import House from "~/components/icons/house";
import MessageSquare from "~/components/icons/message-square";
import Package from "~/components/icons/package";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import Users from "~/components/icons/users";
import { AccountMenu } from "~/components/layout/account-menu";
import { useSession } from "~/components/providers/session-provider";
import { getSidebarRoutes } from "~/lib/auth/access/route-policy";
import { cn } from "~/lib/utils";

const SIDEBAR_GROUPS = [
  { key: "platform", label: "Plataforma" },
  { key: "sales", label: "Ventas" },
  { key: "inventory", label: "Inventario" },
] as const;

const ICONS: Record<string, Component<{ class?: string }>> = {
  dashboard: House,
  team: Users,
  settings: Settings,
  leads: Users,
  quota: ShieldCheck,
  validation: MessageSquare,
  inventory: Package,
};

export function Sidebar() {
  const location = useLocation();
  const { currentUser } = useSession();
  const navGroups = createMemo(() =>
    SIDEBAR_GROUPS.map((group) => ({
      label: group.label,
      items: getSidebarRoutes(currentUser().role, group.key),
    })).filter((group) => group.items.length > 0),
  );

  return (
    <aside class="fixed inset-y-0 left-0 z-10 w-64 border-r bg-background flex flex-col transition-transform duration-300">
      <div class="h-14 flex items-center px-6 border-b">
        <span class="font-bold text-lg tracking-tight">OneChannel</span>
      </div>
      <div class="p-4">
        <button
          type="button"
          class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium border rounded-md shadow-sm bg-white hover:bg-gray-50 transition-colors"
        >
          <span>Espacio de {currentUser().fullName.split(" ")[0]}</span>
          <ChevronDown class="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto px-4 space-y-6">
        <For each={navGroups()}>
          {(group) => (
            <div class="space-y-1">
              <h4 class="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.label}
              </h4>
              <For each={group.items}>
                {(item) => {
                  const isActive = () =>
                    location.pathname.startsWith(item.href);
                  const Icon = ICONS[item.id];
                  return (
                    <A
                      href={item.href}
                      class={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive()
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {Icon ? (
                        <Icon
                          class={cn(
                            "w-4 h-4",
                            isActive()
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        />
                      ) : null}
                      {item.label}
                    </A>
                  );
                }}
              </For>
            </div>
          )}
        </For>
      </nav>
      <div class="p-4 border-t">
        <AccountMenu fullName={currentUser().fullName} onLogout={logout} />
      </div>
    </aside>
  );
}
