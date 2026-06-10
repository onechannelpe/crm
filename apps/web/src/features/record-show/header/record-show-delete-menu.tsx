import { Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";

import DotsVertical from "~/components/icons/dots-vertical";
import Trash from "~/components/icons/trash";
import { TopBarActionButton } from "~/components/layout/top-bar-action-button";
import { TopBarTooltip } from "~/components/layout/top-bar-tooltip";

import styles from "./record-show-delete-menu.module.css";

type RecordShowDeleteMenuProps = {
  disabled?: boolean;
  onDelete: () => void;
};

export function RecordShowDeleteMenu(props: RecordShowDeleteMenuProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({ top: 0, left: 0 });
  let rootRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  function updateMenuPosition() {
    if (!rootRef) return;
    const rect = rootRef.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, left: rect.right });
  }

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isOpen()) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef?.contains(target) || menuRef?.contains(target)) return;
      setIsOpen(false);
    };

    window.document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() =>
      window.document.removeEventListener("pointerdown", handlePointerDown),
    );
  });

  createEffect(() => {
    if (!isOpen()) return;
    updateMenuPosition();

    const onViewportChange = () => updateMenuPosition();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    onCleanup(() => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    });
  });

  return (
    <div class={styles.root} ref={(el) => (rootRef = el)}>
      <TopBarTooltip content="Más opciones">
        <TopBarActionButton
          ariaLabel="Más opciones"
          iconOnly
          pressed={isOpen()}
          onClick={() => {
            const next = !isOpen();
            setIsOpen(next);
            if (next) updateMenuPosition();
          }}
        >
          <DotsVertical size={16} />
        </TopBarActionButton>
      </TopBarTooltip>
      <Show when={isOpen()}>
        <Portal>
          <div
            class={styles.menu}
            role="menu"
            ref={(el) => (menuRef = el)}
            style={{
              top: `${menuPosition().top}px`,
              left: `${menuPosition().left}px`,
            }}
          >
            <button
              type="button"
              class={styles.dangerItem}
              role="menuitem"
              disabled={props.disabled}
              onClick={() => {
                setIsOpen(false);
                props.onDelete();
              }}
            >
              <Trash size={14} />
              <span>Eliminar empresa</span>
            </button>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
