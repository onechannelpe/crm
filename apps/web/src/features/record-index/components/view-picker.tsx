import { For, Show, createEffect, createSignal, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";

import { useRecordIndexModelContext } from "../context/model-context";
import { useRecordIndexSetup } from "../context/setup-context";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

export function RecordIndexViewPicker() {
  const setup = useRecordIndexSetup();
  const model = useRecordIndexModelContext();
  const views = setup.views;

  let container: HTMLDivElement | undefined;
  let menu: HTMLDivElement | undefined;
  const [menuPosition, setMenuPosition] = createSignal({ left: 0, top: 0 });

  const MENU_GUTTER = 8;
  const MENU_OFFSET = 8;
  const FALLBACK_MENU_WIDTH = 232;

  const isOpen = () => model.columns.openMenu() === "views";

  function resolveTrigger() {
    const parent = container?.parentElement;
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
    getContainer: () => container?.parentElement ?? container,
    getAdditionalContainers: () => [menu],
  });

  createEffect(() => {
    if (!isOpen()) {
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
    <Show when={views}>
      {(safeViews) => (
        <div ref={(el) => (container = el)}>
          <Show when={isOpen()}>
            <Portal>
              <div
                ref={(element) => (menu = element)}
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
