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
import {
  getSidebarChildren,
  getSidebarRoutes,
  type AppRoute,
  type RouteIcon,
} from "~/lib/auth/access/route-policy";
import { cn } from "~/lib/utils";

import styles from "./shell.module.css";

const SIDEBAR_EXPANDED_STORAGE_KEY = "crm-sidebar-expanded";

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

export function Sidebar() {
  const location = useLocation();
  const { currentUser } = useSession();
  const [expanded, setExpanded] = createSignal(true);
  const [hovered, setHovered] = createSignal(false);

  const role = () => currentUser().role;
  const firstName = createMemo(
    () =>
      currentUser().fullName.trim().split(/\s+/)[0] || currentUser().fullName,
  );

  const isRouteActive = (route: AppRoute) => {
    const prefixes = route.activePrefixes;
    if (prefixes && prefixes.length > 0) {
      return prefixes.some(
        (prefix) =>
          location.pathname === prefix ||
          location.pathname.startsWith(`${prefix}/`),
      );
    }
    return (
      location.pathname === route.href ||
      location.pathname.startsWith(`${route.href}/`)
    );
  };

  const quickItems = createMemo(() => getSidebarRoutes(role(), "quick"));
  const workspaceItems = createMemo(() =>
    getSidebarRoutes(role(), "workspace"),
  );

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
      ? "var(--nav-drawer-width)"
      : "var(--nav-drawer-collapsed-width)";
    document.documentElement.style.setProperty(
      "--nav-drawer-current-width",
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

  return (
    <aside
      class={styles.sidebar}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div class={cn(styles.sidebarTop, !expanded() && styles.collapsedTop)}>
        <AccountMenu
          label={firstName()}
          collapsed={!expanded()}
          onLogout={logout}
        />
        <button
          type="button"
          class={styles.collapse}
          onClick={toggleExpanded}
          title={expanded() ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={expanded() ? "Collapse sidebar" : "Expand sidebar"}
          style={{
            opacity: expanded() ? (hovered() ? "1" : "0") : "1",
            transition: "opacity 150ms var(--ease-standard)",
          }}
        >
          <ChevronDown
            size={16}
            style={{
              transform: expanded() ? "rotate(90deg)" : "rotate(-90deg)",
              transition: "transform 150ms var(--ease-standard)",
            }}
          />
        </button>
      </div>

      <nav
        class={cn(styles.sidebarScroll, !expanded() && styles.collapsedScroll)}
      >
        <section
          class={cn(styles.section, !expanded() && styles.collapsedSection)}
        >
          <For each={quickItems()}>
            {(item) => {
              const Icon = ICON_BY_ROUTE[item.icon];
              return (
                <>
                  <A
                    href={item.href}
                    class={cn(
                      styles.link,
                      !expanded() && styles.collapsedLink,
                      isRouteActive(item) ? styles.linkActive : undefined,
                    )}
                  >
                    <Icon size={16} />
                    <span class={cn(!expanded() && styles.collapsedLabel)}>
                      {item.navLabel ?? item.label}
                    </span>
                  </A>
                  <Show
                    when={
                      item.id === "client-search-people" &&
                      getSidebarChildren(role(), item.id).length > 0 &&
                      expanded()
                    }
                  >
                    <div class={styles.subgroup}>
                      <For each={getSidebarChildren(role(), item.id)}>
                        {(child) => (
                          <A
                            href={child.route.href}
                            class={cn(
                              styles.link,
                              styles.subItem,
                              isRouteActive(child.route)
                                ? styles.linkActive
                                : undefined,
                            )}
                          >
                            <span class={styles.dot} />
                            <span>{child.label}</span>
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

        <section
          class={cn(styles.section, !expanded() && styles.collapsedSection)}
        >
          <h4
            class={cn(
              styles.sectionTitle,
              !expanded() && styles.collapsedTitle,
            )}
          >
            Workspace
          </h4>
          <For each={workspaceItems()}>
            {(item) => {
              const Icon = ICON_BY_ROUTE[item.icon];
              return (
                <>
                  <A
                    href={item.href}
                    class={cn(
                      styles.link,
                      !expanded() && styles.collapsedLink,
                      isRouteActive(item) ? styles.linkActive : undefined,
                    )}
                  >
                    <Icon size={16} />
                    <span class={cn(!expanded() && styles.collapsedLabel)}>
                      {item.navLabel ?? item.label}
                    </span>
                  </A>
                  <Show
                    when={
                      item.id === "leads" &&
                      getSidebarChildren(role(), item.id).length > 0 &&
                      expanded()
                    }
                  >
                    <div class={styles.subgroup}>
                      <For each={getSidebarChildren(role(), item.id)}>
                        {(child) => (
                          <A
                            href={child.route.href}
                            class={cn(
                              styles.link,
                              styles.subItem,
                              isRouteActive(child.route)
                                ? styles.linkActive
                                : undefined,
                            )}
                          >
                            <span class={styles.dot} />
                            <span>{child.label}</span>
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
  );
}
