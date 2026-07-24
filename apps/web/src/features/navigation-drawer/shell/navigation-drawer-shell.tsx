import { useLocation, useNavigate } from "@solidjs/router";
import { Show, createSignal, type JSX } from "solid-js";

import { logout } from "~/actions/auth/session";
import LayoutSidebarLeftCollapse from "~/components/icons/layout-sidebar-left-collapse";
import Search from "~/components/icons/search";
import X from "~/components/icons/x";
import { AccountMenu } from "~/components/layout/account-menu";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { LightIconButton } from "~/components/ui/input/light-icon-button";
import { useResizablePanel } from "~/components/ui/layout/resizable-panel/use-resizable-panel";
import { shortName } from "~/lib/users/display-name";
import { cn } from "~/lib/utils";

import { NAVIGATION_DRAWER_CLICK_OUTSIDE_ID } from "../constants/navigation-drawer-click-outside-id";
import { useIsSettingsDrawer } from "../hooks/use-is-settings-drawer";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";
import {
  NAVIGATION_DRAWER_WIDTH_CONSTRAINTS,
  NAVIGATION_DRAWER_WIDTH_VAR,
} from "../state/navigation-drawer-width";
import { NavigationDrawerWidthEffect } from "./navigation-drawer-width-effect";

import styles from "./navigation-drawer-shell.module.css";

interface NavigationDrawerProps {
  title: string;
  className?: string;
  children: JSX.Element;
}

export function NavigationDrawer(props: NavigationDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuthenticatedSession();
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

  const onPointerDown = useResizablePanel({
    side: "right",
    constraints: NAVIGATION_DRAWER_WIDTH_CONSTRAINTS,
    getCurrentWidth: width,
    onWidthChange: setWidth,
    onCollapse: () => setExpanded(false),
    onResizeStart: () => setResizing(true),
    onResizeEnd: () => setResizing(false),
    cssVariableName: NAVIGATION_DRAWER_WIDTH_VAR,
    dragThresholdPx: 4,
  });

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
      <NavigationDrawerWidthEffect />
      <div
        class={cn(
          styles.drawer,
          resizing() && styles.drawerResizing,
          props.className,
          isSettingsDrawer() && styles.drawerSettings,
          expanded() && !isMobile() && styles.drawerExpandedDesktop,
          !expanded() && !isMobile() && styles.drawerCollapsedDesktop,
          isMobile() && expanded() && styles.drawerOpenMobile,
        )}
      >
        <div class={styles.drawerInner}>
          <Show
            when={!isMobile() && isSettingsDrawer()}
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

                <div class={styles.headerActions}>
                  <Show when={!isMobile()}>
                    <LightIconButton
                      Icon={Search}
                      accent="secondary"
                      onClick={() => navigate("/search")}
                      aria-label="Buscar"
                    />
                  </Show>
                  <Show when={expanded()}>
                    <div class={styles.collapseButtonContainer}>
                      <LightIconButton
                        Icon={LayoutSidebarLeftCollapse}
                        accent="secondary"
                        onClick={() => setExpanded((value) => !value)}
                        aria-label="Contraer barra lateral"
                      />
                    </div>
                  </Show>
                </div>
              </header>
            }
          >
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

          {props.children}

          <Show when={!isMobile() && !isSettingsDrawer() && expanded()}>
            <button
              type="button"
              class={cn(styles.resizeHandle, resizing() && styles.resizing)}
              onPointerDown={onPointerDown}
              aria-label="Redimensionar barra lateral"
            />
          </Show>
        </div>
      </div>
    </aside>
  );
}

export { NavigationDrawer as NavigationDrawerShell };
