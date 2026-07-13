import { Show } from "solid-js";

import Search from "~/components/icons/search";

import { useRecordIndex } from "../../context/record-index-context";

import sharedStyles from "../../styles/menu.module.css";

export function AnyFieldSearchMenuItem() {
  const recordIndex = useRecordIndex();

  return (
    <Show when={recordIndex.search}>
      {(search) => (
        <button
          type="button"
          class={sharedStyles.menuItem}
          onClick={() =>
            recordIndex.filtering?.setPanel({ kind: "any-field-search" })
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
