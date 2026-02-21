import { A, useLocation } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onMount,
  Show,
  type Component,
} from "solid-js";

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
import { Button } from "~/components/ui/input/button";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";
import { canAccessPath } from "~/lib/auth/access/route-policy";
import { cn } from "~/lib/utils";

type SidebarItem = {
  label: string;
  href: string;
  icon: Component<{ class?: string }>;
  isActive?: (pathname: string) => boolean;
};

const WORKSPACE_ITEMS: SidebarItem[] = [
  { label: "People", href: "/team", icon: Users },
  { label: "Companies", href: "/inventory", icon: House },
  {
    label: "Opportunities",
    href: "/leads",
    icon: MessageSquare,
    isActive: (pathname) => /^\/(dashboard|leads)(\/|$)/.test(pathname),
  },
  { label: "Tasks", href: "/validation", icon: ShieldCheck },
  { label: "Notes", href: "/audit", icon: MessageSquare },
  { label: "Dashboards", href: "/quota", icon: Package },
];

const OPPORTUNITY_VIEWS: Array<Omit<SidebarItem, "icon">> = [
  { label: "All Opportunities", href: "/leads" },
  { label: "By Stage", href: "/dashboard" },
];

const SEARCH_VIEWS: Array<Omit<SidebarItem, "icon">> = [
  { label: "People", href: "/client-search/people" },
  { label: "Companies", href: "/client-search/companies" },
];

const SIDEBAR_EXPANDED_STORAGE_KEY = "crm-sidebar-expanded";

export function Sidebar() {
  const location = useLocation();
  const { currentUser } = useSession();
  const role = () => currentUser().role;
  const firstName = createMemo(
    () => currentUser().fullName.trim().split(/\s+/)[0] || currentUser().fullName,
  );
  const [expanded, setExpanded] = createSignal(true);
  const [hovered, setHovered] = createSignal(false);

  const canAccess = (href: string) => canAccessPath(role(), href);

  const showSearch = createMemo(() => canAccess("/client-search/people"));
  const showSettings = createMemo(() => canAccess("/settings"));

  const workspaceItems = createMemo(() =>
    WORKSPACE_ITEMS.filter((item) => canAccess(item.href)),
  );
  const opportunityViews = createMemo(() =>
    OPPORTUNITY_VIEWS.filter((item) => canAccess(item.href)),
  );
  const isDashboardRoute = createMemo(() =>
    /^\/dashboard(\/|$)/.test(location.pathname),
  );
  const isLeadsRoute = createMemo(() => /^\/leads(\/|$)/.test(location.pathname));
  const isSearchRoute = createMemo(() =>
    /^\/client-search\/(people|companies)(\/|$)/.test(location.pathname),
  );
  const searchViews = createMemo(() =>
    SEARCH_VIEWS.filter((item) => canAccess(item.href)),
  );
  const isPathActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  onMount(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY)
        : null;
    if (stored === "false") {
      setExpanded(false);
    }
  });

  createEffect(() => {
    if (typeof document === "undefined") return;
    const width = expanded()
      ? "var(--tw-navigation-drawer-width)"
      : "var(--tw-navigation-drawer-collapsed-width)";
    document.documentElement.style.setProperty(
      "--tw-navigation-drawer-current-width",
      width,
    );
  });

  const toggleExpanded = () => {
    const next = !expanded();
    setExpanded(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(next));
    }
  };

  const mobileItems = createMemo(() =>
    [
      ...(showSearch() ? [{ label: "Search", href: "/client-search/people", icon: Search }] : []),
      ...workspaceItems(),
    ].slice(0, 5),
  );

  return (
    <>
      <aside
        class="tw-sidebar fixed inset-y-0 left-0 hidden w-[var(--tw-navigation-drawer-current-width)] flex-col md:flex"
        data-collapsed={!expanded()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ "z-index": DS_Z_INDEX.navigation }}
      >
        <div class="tw-sidebar-top gap-2">
          <AccountMenu
            label={firstName()}
            collapsed={!expanded()}
            onLogout={logout}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleExpanded}
            class={cn(
              "tw-sidebar-collapse hidden h-7 w-7 text-muted-foreground md:inline-flex",
              expanded() ? (hovered() ? "opacity-100" : "opacity-0") : "opacity-100",
            )}
            title={expanded() ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={expanded() ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronDown
              class={cn(
                "h-4 w-4 transition-transform",
                expanded() ? "rotate-90" : "-rotate-90",
              )}
            />
          </Button>
        </div>

        <nav class="tw-sidebar-scroll">
          <section class="tw-nav-section">
            <Show when={showSearch()}>
              <A
                href="/client-search/people"
                class={cn(
                  "tw-sidebar-link",
                  isSearchRoute() && "tw-sidebar-link-active",
                )}
              >
                <Search class="h-4 w-4" />
                <span class="tw-sidebar-label">Search</span>
              </A>
            </Show>
            <Show when={showSearch() && searchViews().length > 0}>
              <div
                class="tw-sidebar-subgroup"
                data-expanded="true"
              >
                <For each={searchViews()}>
                  {(view) => (
                    <A
                      href={view.href}
                      class={cn(
                        "tw-sidebar-link",
                        location.pathname === view.href && "tw-sidebar-link-active",
                      )}
                      data-indent="2"
                    >
                      <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
                      <span class="tw-sidebar-label">{view.label}</span>
                    </A>
                  )}
                </For>
              </div>
            </Show>
            <Show when={showSettings()}>
              <A
                href="/settings"
                class={cn(
                  "tw-sidebar-link",
                  location.pathname.startsWith("/settings") &&
                    "tw-sidebar-link-active",
                )}
              >
                <Settings class="h-4 w-4" />
                <span class="tw-sidebar-label">Settings</span>
              </A>
            </Show>
          </section>

          <section class="tw-nav-section">
            <h4 class="tw-sidebar-group-title tw-sidebar-label">Workspace</h4>
            <For each={workspaceItems()}>
              {(item) => {
                const isActive =
                  item.isActive?.(location.pathname) ?? isPathActive(item.href);
                const Icon = item.icon;
                return (
                  <>
                    <A
                      href={item.href}
                      class={cn("tw-sidebar-link", isActive && "tw-sidebar-link-active")}
                    >
                      <Icon class="h-4 w-4" />
                      <span class="tw-sidebar-label">{item.label}</span>
                    </A>
                    <Show
                      when={
                        item.label === "Opportunities" &&
                        opportunityViews().length > 0
                      }
                    >
                      <div class="tw-sidebar-subgroup" data-expanded="true">
                        <For each={opportunityViews()}>
                          {(view) => (
                            <A
                              href={view.href}
                              class={cn(
                                "tw-sidebar-link",
                                (view.href === "/dashboard"
                                  ? isDashboardRoute()
                                  : isLeadsRoute()) && "tw-sidebar-link-active",
                              )}
                              data-indent="2"
                            >
                              <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
                              <span class="tw-sidebar-label">{view.label}</span>
                            </A>
                          )}
                        </For>
                      </div>
                    </Show>
                  </>
                );
              }}
            </For>
          </section>
        </nav>

      </aside>

      <nav
        class="fixed inset-x-3 bottom-3 flex items-center justify-between border border-border bg-surface p-1 md:hidden"
        style={{ "z-index": DS_Z_INDEX.navigation }}
      >
        <For each={mobileItems()}>
          {(item) => {
            const isActive =
              location.pathname === item.href ||
              location.pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <A
                href={item.href}
                class={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-sm px-2 py-2 text-[11px] font-medium",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Icon class="h-3.5 w-3.5" />
                <span class="truncate">{item.label}</span>
              </A>
            );
          }}
        </For>
      </nav>
    </>
  );
}
