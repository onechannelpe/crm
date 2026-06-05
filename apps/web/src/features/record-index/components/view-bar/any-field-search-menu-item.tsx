import { Show } from "solid-js";

import Search from "~/components/icons/search";

import { useRecordIndexModelContext } from "../../context/model-context";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

export function AnyFieldSearchMenuItem() {
  const model = useRecordIndexModelContext();

  return (
    <Show when={model.search}>
      {(search) => (
        <button
          type="button"
          role="menuitem"
          class={sharedStyles.menuItem}
          onClick={() =>
            model.filtering?.setPanel({ kind: "any-field-search" })
          }
        >
          <span class={sharedStyles.menuItemIcon}>
            <Search size={16} />
          </span>
          <span>Buscar en cualquier campo</span>
          <Show when={search().value().trim()}>
            {(value) => (
              <span class={sharedStyles.menuItemContext}>· {value()}</span>
            )}
          </Show>
        </button>
      )}
    </Show>
  );
}
