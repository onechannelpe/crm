import { A, useLocation } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onMount,
  Show,
} from "solid-js";

import { logout } from "~/actions/auth";
import ChevronDown from "~/components/icons/chevron-down";
import { AccountMenu } from "~/components/layout/account-menu";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { useSession } from "~/components/providers/session-provider";
import {
  getSidebarChildren,
  getSidebarGrouped,
  getSidebarRoutes,
  type NavRoute,
} from "~/lib/nav/nav-policy";
import { cn } from "~/lib/utils";

import styles from "./shell.module.css";

const SIDEBAR_EXPANDED_STORAGE_KEY = "crm-sidebar-expanded";

function NavItem(props: {
  item: NavRoute;
  expanded: boolean;
  active: boolean;
  children: ReturnType<typeof getSidebarChildren>;
}) {
  const location = useLocation();
  const Icon = ICON_BY_ROUTE[props.item.icon];

  return (
    <div
      class={cn(
        props.children.length > 0 && styles.itemGroup,
        props.children.length > 0 &&
          !props.expanded &&
          styles.itemGroupCollapsed,
      )}
    >
      <A
        href={props.item.href}
        class={cn(
          styles.link,
          !props.expanded && styles.collapsedLink,
          props.active ? styles.linkActive : undefined,
        )}
      >
        <Icon size={16} />
        <span
          class={cn(
            styles.linkLabel,
            !props.expanded && styles.linkLabelCollapsed,
          )}
        >
          {props.item.navLabel ?? props.item.label}
        </span>
      </A>
      <Show when={props.children.length > 0}>
        <div
          class={cn(
            styles.subgroup,
            !props.expanded && styles.subgroupCollapsed,
          )}
        >
          <For each={props.children}>
            {(child) => (
              <A
                href={child.href}
                class={cn(
                  styles.link,
                  styles.subItem,
                  location.pathname === child.href ||
                    location.pathname.startsWith(`${child.href}/`)
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
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const { currentUser } = useSession();
  const [expanded, setExpanded] = createSignal(true);
  const [hovered, setHovered] = createSignal(false);

  const role = createMemo(() => currentUser().role);
  const firstName = createMemo(() => currentUser().names);

  const isRouteActive = (route: NavRoute) => {
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

  const quickItems = createMemo(() => getSidebarRoutes(role(), "primary"));
  const workspaceGroups = createMemo(() =>
    getSidebarGrouped(role(), "secondary"),
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
          avatarUrl={currentUser().avatarUrl}
          collapsed={!expanded()}
          onLogout={logout}
        />
        <button
          type="button"
          class={styles.collapse}
          onClick={toggleExpanded}
          title={
            expanded() ? "Contraer barra lateral" : "Expandir barra lateral"
          }
          aria-label={
            expanded() ? "Contraer barra lateral" : "Expandir barra lateral"
          }
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
        {/* Primary items (Inicio, Crear venta, Agenda) */}
        <section
          class={cn(styles.section, !expanded() && styles.collapsedSection)}
        >
          <For each={quickItems()}>
            {(item) => {
              const children = createMemo(() =>
                getSidebarChildren(role(), item.id),
              );
              return (
                <NavItem
                  item={item}
                  expanded={expanded()}
                  active={isRouteActive(item)}
                  children={children()}
                />
              );
            }}
          </For>
        </section>

        {/* Secondary items, split into labelled groups */}
        <section
          class={cn(styles.section, !expanded() && styles.collapsedSection)}
        >
          <div class={styles.divider} />
          <For each={workspaceGroups()}>
            {(group) => (
              <>
                <Show when={group.label}>
                  <div
                    class={cn(
                      styles.sectionTitle,
                      !expanded() && styles.collapsedTitle,
                    )}
                  >
                    {group.label}
                  </div>
                </Show>
                <For each={group.items}>
                  {(item) => {
                    const children = createMemo(() =>
                      getSidebarChildren(role(), item.id),
                    );
                    return (
                      <NavItem
                        item={item}
                        expanded={expanded()}
                        active={isRouteActive(item)}
                        children={children()}
                      />
                    );
                  }}
                </For>
              </>
            )}
          </For>
        </section>
      </nav>
    </aside>
  );
}
