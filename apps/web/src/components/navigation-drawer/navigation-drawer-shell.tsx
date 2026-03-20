import { Show, createSignal, onCleanup } from "solid-js";

import ChevronLeft from "~/components/icons/chevron-left";
import ChevronRight from "~/components/icons/chevron-right";
import Search from "~/components/icons/search";
import { AccountMenu } from "~/components/layout/account-menu";
import { useSession } from "~/components/providers/session-provider";
import { cn } from "~/lib/utils";

import { useNavigationDrawerState } from "./navigation-drawer-state";
import styles from "./navigation-drawer.module.css";

interface NavigationDrawerShellProps {
  isSettings: boolean;
  onSearch: () => void;
  children: JSX.Element;
}

const MIN_WIDTH = 180;
const MAX_WIDTH = 320;

export function NavigationDrawerShell(props: NavigationDrawerShellProps) {
  const { currentUser } = useSession();
  const {
    expanded,
    setExpanded,
    width,
    setWidth,
    isMobile,
    currentMobileDrawer,
    setCurrentMobileDrawer,
  } = useNavigationDrawerState();

  const [hovered, setHovered] = createSignal(false);
  const [resizing, setResizing] = createSignal(false);

  const handleResizeStart = (event: MouseEvent) => {
    if (!expanded() || isMobile()) return;

    event.preventDefault();
    setResizing(true);

    const startX = event.clientX;
    const startWidth = width();

    const handleMove = (moveEvent: MouseEvent) => {
      const next = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX),
      );
      setWidth(next);
    };

    const handleEnd = () => {
      setResizing(false);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);

    onCleanup(() => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
    });
  };

  const closeMobileDrawer = () => {
    if (isMobile()) {
      setExpanded(false);
    }
  };

  const toggleExpanded = () => {
    setExpanded((current) => !current);
  };

  const isDrawerVisible = () => (isMobile() ? expanded() : true);

  return (
    <>
      <div
        class={cn(styles.mobileScrim, isDrawerVisible() && styles.mobileScrimVisible)}
        onClick={closeMobileDrawer}
      />

      <aside class={styles.drawerHost}>
        <div
          class={cn(
            styles.drawer,
            !expanded() && styles.drawerCollapsed,
            isMobile() && isDrawerVisible() && styles.drawerOpenMobile,
            isMobile() && !isDrawerVisible() && styles.drawerClosedMobile,
          )}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ width: isMobile() ? undefined : expanded() ? `${width()}px` : "40px" }}
        >
          <div class={cn(styles.drawerInner, !expanded() && styles.drawerCollapsed)}>
            <div class={cn(styles.header, !expanded() && styles.headerCollapsed)}>
              <AccountMenu
                label={currentUser().name}
                avatarUrl={currentUser().avatarUrl}
                collapsed={!expanded() && !isMobile()}
                onLogout={async () => {
                  const { logout } = await import("~/actions/auth");
                  await logout();
                }}
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
                    onClick={toggleExpanded}
                    aria-label={expanded() ? "Contraer barra lateral" : "Expandir barra lateral"}
                    style={{
                      opacity: expanded() ? (hovered() ? "1" : "0") : "1",
                      transition: "opacity 150ms var(--ease-standard)",
                    }}
                  >
                    {expanded() ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                  </button>
                </div>
              </Show>
            </div>

            {props.children}

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

      <Show when={isMobile()}>
        <nav class={styles.mobileBar}>
          <button
            type="button"
            class={cn(
              styles.mobileBarItem,
              currentMobileDrawer() === "main" && expanded() && styles.mobileBarItemActive,
            )}
            onClick={() => {
              setCurrentMobileDrawer("main");
              setExpanded((current) => !current || currentMobileDrawer() !== "main");
            }}
            aria-label="Abrir navegación"
          >
            <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
          </button>
          <button
            type="button"
            class={styles.mobileBarItem}
            onClick={props.onSearch}
            aria-label="Buscar"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            class={cn(
              styles.mobileBarItem,
              currentMobileDrawer() === "settings" && expanded() && styles.mobileBarItemActive,
            )}
            onClick={() => {
              setCurrentMobileDrawer("settings");
              setExpanded(true);
            }}
            aria-label="Abrir ajustes"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      </Show>
    </>
  );
}
