import { useLocation, useNavigate } from "@solidjs/router";
import { Show, createSignal, type JSX } from "solid-js";

import { logout } from "~/actions/auth";
import ChevronLeft from "~/components/icons/chevron-left";
import ChevronRight from "~/components/icons/chevron-right";
import Search from "~/components/icons/search";
import X from "~/components/icons/x";
import { AccountMenu } from "~/components/layout/account-menu";
import { useSession } from "~/components/providers/session-provider";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { shortName } from "~/lib/users/display-name";
import { cn } from "~/lib/utils";

import { useNavigationDrawerState } from "./navigation-drawer-state";

import styles from "./navigation-drawer.module.css";

interface NavigationDrawerShellProps {
  isSettings: boolean;
  title?: string;
  onSearch?: () => void;
  children: JSX.Element;
  fixedContent?: JSX.Element;
}

const MIN_WIDTH = 180;
const MAX_WIDTH = 350;

export function NavigationDrawerShell(props: NavigationDrawerShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useSession();
  const {
    expanded,
    setExpanded,
    width,
    setWidth,
    isMobile,
    memorizedExpanded,
    memorizedPath,
    setMemorizedExpanded,
    setMemorizedPath,
  } = useNavigationDrawerState();

  const [hovered, setHovered] = createSignal(false);
  const [resizing, setResizing] = createSignal(false);

  let drawerPanelRef: HTMLDivElement | undefined;

  useDismissibleLayer({
    enabled: () => isMobile() && expanded(),
    onDismiss: () => setExpanded(false),
    getContainer: () => drawerPanelRef,
  });

  const handleResizeStart = (event: MouseEvent) => {
    if (!expanded() || isMobile() || props.isSettings) {
      return;
    }

    event.preventDefault();
    setResizing(true);

    const startX = event.clientX;
    const startWidth = width();

    const handleMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX),
      );

      setWidth(nextWidth);
    };

    const handleEnd = () => {
      setResizing(false);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
  };

  const memorizeNavigationState = () => {
    setMemorizedExpanded(expanded());
    setMemorizedPath(location.pathname + location.search);
  };

  const closeSettings = () => {
    const nextPath = memorizedPath();
    const fallbackPath = getDefaultAppPath(currentUser().role);
    const targetPath =
      nextPath && !nextPath.startsWith("/settings") && !nextPath.startsWith("/admin")
        ? nextPath
        : fallbackPath;

    navigate(targetPath);
    setExpanded(memorizedExpanded());
  };

  return (
    <aside class={styles.drawerHost}>
      <div
        class={cn(
          styles.drawer,
          !expanded() && styles.drawerCollapsed,
          isMobile() && expanded() && styles.drawerOpenMobile,
          isMobile() && !expanded() && styles.drawerClosedMobile,
        )}
        style={{
          width: isMobile() ? undefined : expanded() ? `${width()}px` : "40px",
        }}
      >
        <div
          ref={(element) => {
            drawerPanelRef = element;
          }}
          class={cn(styles.drawerInner, !expanded() && styles.drawerCollapsed)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Show
            when={props.isSettings}
            fallback={
              <header
                class={cn(styles.header, !expanded() && styles.headerCollapsed)}
              >
                <AccountMenu
                  label={shortName(currentUser())}
                  avatarUrl={currentUser().avatarUrl}
                  collapsed={!expanded() && !isMobile()}
                  onOpenSettings={memorizeNavigationState}
                  onLogout={logout}
                />

                <Show when={!isMobile()}>
                  <div class={styles.headerActions}>
                    <button
                      type="button"
                      class={styles.searchButton}
                      onClick={props.onSearch}
                      aria-label="Buscar"
                    >
                      <Search size={16} />
                    </button>
                    <button
                      type="button"
                      class={styles.collapseButton}
                      onClick={() => setExpanded((value) => !value)}
                      aria-label={
                        expanded()
                          ? "Contraer barra lateral"
                          : "Expandir barra lateral"
                      }
                      style={{
                        opacity: expanded() ? (hovered() ? "1" : "0") : "1",
                      }}
                    >
                      {expanded() ? (
                        <ChevronLeft size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  </div>
                </Show>
              </header>
            }
          >
            <Show when={!isMobile()}>
              <header class={styles.settingsBackHeader}>
                <button
                  type="button"
                  class={styles.settingsBackButton}
                  onClick={closeSettings}
                >
                  <X size={16} />
                  <span>{props.title ?? "Salir"}</span>
                </button>
              </header>
            </Show>
          </Show>

          <div class={styles.scrollable}>{props.children}</div>

          {props.fixedContent ? (
            <div class={styles.fixedContent}>{props.fixedContent}</div>
          ) : null}

          <Show when={!isMobile() && !props.isSettings && expanded()}>
            <button
              type="button"
              class={cn(styles.resizeHandle, resizing() && styles.resizing)}
              onMouseDown={handleResizeStart}
              aria-label="Redimensionar barra lateral"
            />
          </Show>
        </div>
      </div>
    </aside>
  );
}
