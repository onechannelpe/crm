import { For, Show, createEffect, createSignal, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";

import { useRecordIndexModelContext } from "../context/model-context";
import { useRecordIndexSetup } from "../context/setup-context";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

export function RecordIndexViewPicker() {
  const setup = useRecordIndexSetup();
  const model = useRecordIndexModelContext();

  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
  const [menuRef, setMenuRef] = createSignal<HTMLDivElement>();
  const [menuPosition, setMenuPosition] = createSignal({ left: 0, top: 0 });

  const MENU_GUTTER = 8;
  const MENU_OFFSET = 8;
  const FALLBACK_MENU_WIDTH = 232;

  const isOpen = () => model.columns.openMenu() === "views";

  function resolveTrigger() {
    const parent = containerRef()?.parentElement;
    if (!parent) {
      return undefined;
    }
    const trigger = parent.querySelector("button");
    return trigger instanceof HTMLButtonElement ? trigger : undefined;
  }

  function updateMenuPosition() {
    const trigger = resolveTrigger();
    if (!trigger) {
      return;
    }
    const menu = menuRef();

    const rect = trigger.getBoundingClientRect();
    const menuWidth = menu?.offsetWidth ?? FALLBACK_MENU_WIDTH;
    const left = Math.max(
      MENU_GUTTER,
      Math.min(rect.left, window.innerWidth - menuWidth - MENU_GUTTER),
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
    enabled: isOpen,
    onDismiss: () => model.columns.setOpenMenu(null),
    getContainer: () => containerRef()?.parentElement ?? containerRef(),
    getAdditionalContainers: () => [menuRef()],
  });

  createEffect(() => {
    if (!isOpen()) {
      return;
    }

    updateMenuPosition();

    const handleViewportChange = () => updateMenuPosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    onCleanup(() => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    });
  });

  return (
    <Show when={setup.views}>
      {(safeViews) => (
        <div ref={setContainerRef}>
          <Show when={isOpen()}>
            <Portal>
              <div
                ref={(element) => {
                  setMenuRef(element);
                  updateMenuPosition();
                }}
                class={`${sharedStyles.menu} ${sharedStyles.menuFloating} ${sharedStyles.menuLeft}`}
                id={`${setup.id}-view-picker`}
                role="menu"
                style={{
                  left: `${menuPosition().left}px`,
                  top: `${menuPosition().top}px`,
                }}
              >
                <div class={sharedStyles.menuSectionLabel}>Vista</div>
                <For each={safeViews().available}>
                  {(view) => {
                    const isActive = () => safeViews().active().id === view.id;
                    return (
                      <button
                        type="button"
                        class={sharedStyles.menuItem}
                        role="menuitemradio"
                        aria-checked={isActive() ? "true" : "false"}
                        data-active={isActive() ? "true" : "false"}
                        onClick={() => {
                          safeViews().onSelect(view.id);
                          model.columns.setOpenMenu(null);
                        }}
                      >
                        {view.label}
                      </button>
                    );
                  }}
                </For>
              </div>
            </Portal>
          </Show>
        </div>
      )}
    </Show>
  );
}
