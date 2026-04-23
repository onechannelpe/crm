import { createEffect, createSignal, onCleanup, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";

import styles from "../styles/data-grid.module.css";

export function DataGridToolbarMenu(props: {
  active?: boolean;
  children: JSX.Element;
  label: string;
  menuId: string;
  onDismiss: () => void;
  onToggle: () => void;
  open: boolean;
}) {
  let container: HTMLDivElement | undefined;
  let trigger: HTMLButtonElement | undefined;
  let menu: HTMLDivElement | undefined;
  const [menuPosition, setMenuPosition] = createSignal({ left: 0, top: 0 });

  const MENU_GUTTER = 8;
  const MENU_OFFSET = 8;
  const FALLBACK_MENU_WIDTH = 232;

  function updateMenuPosition() {
    const anchor = trigger;
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const menuWidth = menu?.offsetWidth ?? FALLBACK_MENU_WIDTH;
    const maxLeft = Math.max(
      MENU_GUTTER,
      window.innerWidth - menuWidth - MENU_GUTTER,
    );
    const left = Math.min(
      Math.max(rect.right - menuWidth, MENU_GUTTER),
      maxLeft,
    );
    const menuHeight = menu?.offsetHeight ?? 0;
    const bottomAlignedTop = rect.bottom + MENU_OFFSET;
    const top =
      bottomAlignedTop + menuHeight > window.innerHeight - MENU_GUTTER
        ? Math.max(MENU_GUTTER, rect.top - menuHeight - MENU_OFFSET)
        : bottomAlignedTop;

    setMenuPosition({ left, top });
  }

  useDismissibleLayer({
    enabled: () => props.open,
    onDismiss: props.onDismiss,
    getContainer: () => container,
    getAdditionalContainers: () => [menu],
  });

  createEffect(() => {
    if (!props.open) {
      return;
    }

    updateMenuPosition();
    const rafA = window.requestAnimationFrame(() => {
      updateMenuPosition();
      window.requestAnimationFrame(updateMenuPosition);
    });

    const handleViewportChange = () => updateMenuPosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    onCleanup(() => {
      window.cancelAnimationFrame(rafA);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    });
  });

  return (
    <div class={styles.menuWrap} ref={(element) => (container = element)}>
      <button
        ref={(element) => (trigger = element)}
        type="button"
        class={styles.toolbarButton}
        aria-controls={props.menuId}
        aria-expanded={props.open ? "true" : "false"}
        aria-haspopup="menu"
        data-active={props.active ? "true" : "false"}
        data-open={props.open ? "true" : "false"}
        onClick={props.onToggle}
      >
        {props.label}
      </button>
      {props.open ? (
        <Portal>
          <div
            ref={(element) => (menu = element)}
            class={`${styles.menu} ${styles.menuFloating}`}
            id={props.menuId}
            role="menu"
            style={{
              left: `${menuPosition().left}px`,
              top: `${menuPosition().top}px`,
            }}
          >
            {props.children}
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
