import { A, useLocation } from "@solidjs/router";
import { createMemo, For, type Component } from "solid-js";

import { logout } from "~/actions/auth-session";
import ChevronDown from "~/components/icons/chevron-down";
import House from "~/components/icons/house";
import MessageSquare from "~/components/icons/message-square";
import Package from "~/components/icons/package";
import Search from "~/components/icons/search";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import Users from "~/components/icons/users";
import { AccountMenu } from "~/components/layout/account-menu";
import { useSession } from "~/components/providers/session-provider";
import { getSidebarRoutes } from "~/lib/auth/access/route-policy";
import { getWorkspaceLabel } from "~/lib/auth/access/workspace-label";
import { cn } from "~/lib/utils";

const SIDEBAR_GROUPS = [
  { key: "platform", label: "Plataforma" },
  { key: "sales", label: "Ventas" },
  { key: "inventory", label: "Inventario" },
] as const;

const ICONS: Record<string, Component<{ class?: string }>> = {
  dashboard: House,
  team: Users,
  observability: ShieldCheck,
  settings: Settings,
  leads: Users,
  "client-search": Search,
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
  const mobileItems = createMemo(() =>
    navGroups()
      .flatMap((group) => group.items)
      .slice(0, 5),
  );

  return (
    <>
      <aside class="crm-surface fixed inset-y-4 left-4 z-20 hidden w-68 flex-col rounded-3xl md:flex">
        <div class="flex h-18 items-center px-6">
          <div>
            <p class="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              OneChannel
            </p>
            <p class="font-semibold text-lg tracking-tight">Panel de control</p>
          </div>
        </div>
        <div class="px-4 pb-3">
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl border border-border/80 bg-white/80 px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-white"
          >
            <span>{getWorkspaceLabel(currentUser())}</span>
            <ChevronDown class="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <nav class="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          <For each={navGroups()}>
            {(group) => (
              <div class="space-y-1.5">
                <h4 class="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
                          "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all",
                          isActive()
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-white/85 hover:text-foreground",
                        )}
                      >
                        {Icon ? (
                          <Icon
                            class={cn(
                              "h-4 w-4",
                              isActive()
                                ? "text-primary-foreground"
                                : "text-muted-foreground",
                            )}
                          />
                        ) : null}
                        <span class="font-medium">{item.label}</span>
                      </A>
                    );
                  }}
                </For>
              </div>
            )}
          </For>
        </nav>
        <div class="border-t border-border/70 px-4 py-4">
          <AccountMenu fullName={currentUser().fullName} onLogout={logout} />
        </div>
      </aside>

      <nav class="crm-surface fixed inset-x-3 bottom-3 z-30 flex items-center justify-between rounded-2xl px-2 py-1.5 md:hidden">
        <For each={mobileItems()}>
          {(item) => {
            const isActive = () => location.pathname.startsWith(item.href);
            const Icon = ICONS[item.id];
            return (
              <A
                href={item.href}
                class={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px]",
                  isActive()
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {Icon ? <Icon class="h-3.5 w-3.5" /> : null}
                <span class="truncate">{item.label}</span>
              </A>
            );
          }}
        </For>
      </nav>
    </>
  );
}
