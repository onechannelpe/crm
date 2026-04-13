import { For } from "solid-js";

import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";

import { useRecordIndexModelContext } from "../context/model-context";
import { useRecordIndexSetup } from "../context/setup-context";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

export function RecordIndexViewPicker() {
  const setup = useRecordIndexSetup();
  const model = useRecordIndexModelContext();
  const views = setup.views;

  if (!views) return null;

  let container: HTMLDivElement | undefined;

  const isOpen = () => model.columns.openMenu() === "views";

  useDismissibleLayer({
    enabled: isOpen,
    onDismiss: () => model.columns.setOpenMenu(null),
    getContainer: () => container,
  });

  return (
    <div ref={(el) => (container = el)}>
      {isOpen() ? (
        <div
          class={`${sharedStyles.menu} ${sharedStyles.menuLeft}`}
          id={`${setup.id}-view-picker`}
          role="menu"
        >
          <div class={sharedStyles.menuSectionLabel}>Vista</div>
          <For each={views.available}>
            {(view) => {
              const isActive = () => views.active().id === view.id;
              return (
                <button
                  type="button"
                  class={sharedStyles.menuItem}
                  role="menuitemradio"
                  aria-checked={isActive() ? "true" : "false"}
                  data-active={isActive() ? "true" : "false"}
                  onClick={() => {
                    views.onSelect(view.id);
                    model.columns.setOpenMenu(null);
                  }}
                >
                  {view.label}
                </button>
              );
            }}
          </For>
        </div>
      ) : null}
    </div>
  );
}
