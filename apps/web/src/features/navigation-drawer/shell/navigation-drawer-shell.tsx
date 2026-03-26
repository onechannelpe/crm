import { useLocation, useNavigate } from "@solidjs/router";
import { Show, createSignal, type JSX } from "solid-js";

import { logout } from "~/actions/auth";
import LayoutSidebarLeftCollapse from "~/components/icons/layout-sidebar-left-collapse";
import Search from "~/components/icons/search";
import X from "~/components/icons/x";
import { AccountMenu } from "~/components/layout/account-menu";
import { useSession } from "~/components/providers/session-provider";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { NAVIGATION_DRAWER_CLICK_OUTSIDE_ID } from "~/features/side-panel/constants/side-panel-click-outside-id";
import { shortName } from "~/lib/users/display-name";
import { cn } from "~/lib/utils";

import { useIsSettingsDrawer } from "../hooks/use-is-settings-drawer";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

import styles from "./navigation-drawer-shell.module.css";

const MIN_WIDTH = 180;
const MAX_WIDTH = 350;

interface NavigationDrawerProps {
  title: string;
  className?: string;
  children: JSX.Element;
}

export function NavigationDrawer(props: NavigationDrawerProps) {
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
    setHasMemorizedNavigation,
    memorizeNavigationState,
  } = useNavigationDrawerState();
  const isSettingsDrawer = useIsSettingsDrawer();

  const [resizing, setResizing] = createSignal(false);

  let drawerPanelRef: HTMLDivElement | undefined;

  useDismissibleLayer({
    enabled: () => isMobile() && expanded(),
    onDismiss: () => setExpanded(false),
    getContainer: () => drawerPanelRef,
  });

  const handleResizeStart = (event: MouseEvent) => {
    if (!expanded() || isMobile() || isSettingsDrawer()) {
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

  const memorizeNavigation = () =>
    memorizeNavigationState(location.pathname + location.search, expanded());

  const closeSettings = () => {
    navigate(memorizedPath(), { replace: true });
    setExpanded(memorizedExpanded());
    setHasMemorizedNavigation(false);
  };

  return (
    <aside
      class={styles.drawerHost}
      data-click-outside-id={NAVIGATION_DRAWER_CLICK_OUTSIDE_ID}
    >
      <div
        class={cn(
          styles.drawer,
          props.className,
          isSettingsDrawer() && styles.drawerSettings,
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
        >
          <Show
            when={isSettingsDrawer()}
            fallback={
              <header
                class={cn(styles.header, !expanded() && styles.headerCollapsed)}
              >
                <AccountMenu
                  label={shortName(currentUser())}
                  avatarUrl={currentUser().avatarUrl}
                  collapsed={!expanded() && !isMobile()}
                  onOpenSettings={memorizeNavigation}
                  onLogout={logout}
                />

                <Show when={!isMobile()}>
                  <div class={styles.headerActions}>
                    <button
                      type="button"
                      class={styles.searchButton}
                      onClick={() => navigate("/search")}
                      aria-label="Buscar"
                    >
                      <Search size={16} />
                    </button>
                    <Show when={expanded()}>
                      <button
                        type="button"
                        class={styles.collapseButton}
                        onClick={() => setExpanded((value) => !value)}
                        aria-label="Contraer barra lateral"
                      >
                        <LayoutSidebarLeftCollapse size={14} />
                      </button>
                    </Show>
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
                  <span>{props.title}</span>
                </button>
              </header>
            </Show>
          </Show>

          {props.children}

          <Show when={!isMobile() && !isSettingsDrawer() && expanded()}>
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

export { NavigationDrawer as NavigationDrawerShell };
