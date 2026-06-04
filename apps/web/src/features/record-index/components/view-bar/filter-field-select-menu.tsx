import { createMemo, createSignal, For, Show } from "solid-js";

import List from "~/components/icons/list";

import { useRecordIndexModelContext } from "../../context/model-context";
import { useRecordIndexSetup } from "../../context/setup-context";
import { AnyFieldSearchMenuItem } from "./any-field-search-menu-item";
import { DropdownMenuHeader } from "./menu-primitives";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

type FilterFieldSelectMenuProps = {
  onClose: () => void;
};

export function FilterFieldSelectMenu(props: FilterFieldSelectMenuProps) {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();
  const [fieldSearch, setFieldSearch] = createSignal("");

  const normalizedFieldSearch = createMemo(() =>
    fieldSearch().trim().toLocaleLowerCase(),
  );

  const filteredFilterFields = createMemo(() =>
    (setup.filter?.fields ?? []).filter((field) =>
      field.label.toLocaleLowerCase().includes(normalizedFieldSearch()),
    ),
  );

  return (
    <>
      <DropdownMenuHeader title="Filtrar" onClose={props.onClose} />
      <input
        autofocus
        type="search"
        class={sharedStyles.menuSearchInput}
        value={fieldSearch()}
        placeholder="Buscar campos"
        onInput={(event) => setFieldSearch(event.currentTarget.value)}
      />
      <div class={sharedStyles.menuScrollable}>
        <div class={sharedStyles.menuGroupLabel}>Campos disponibles</div>
        <div class={sharedStyles.menuListbox} role="menu">
          <For each={filteredFilterFields()}>
            {(fieldOption) => {
              const FieldIcon = fieldOption.icon;
              return (
                <button
                  type="button"
                  role="menuitem"
                  class={sharedStyles.menuItem}
                  onClick={() =>
                    model.filtering.setPanel({
                      kind: "field-value",
                      fieldId: fieldOption.id,
                    })
                  }
                >
                  <span class={sharedStyles.menuItemIcon}>
                    <FieldIcon size={16} />
                  </span>
                  <span>{fieldOption.label}</span>
                </button>
              );
            }}
          </For>
        </div>

        <Show when={filteredFilterFields().length === 0}>
          <div class={sharedStyles.menuEmptyState}>No results</div>
        </Show>

        <div class={sharedStyles.menuSeparator} />
        <div class={sharedStyles.menuListbox} role="menu">
          <button
            type="button"
            role="menuitem"
            class={sharedStyles.menuItem}
            onClick={() => {
              model.filtering.setFilterValue(setup.filter?.defaultValue);
              model.anyFieldFilter?.setValue("");
              model.filtering.setPanel({ kind: "field-list" });
              props.onClose();
            }}
          >
            <span class={sharedStyles.menuItemIcon}>
              <List size={16} />
            </span>
            <span>Quitar filtros</span>
          </button>
          <AnyFieldSearchMenuItem />
        </div>
      </div>
    </>
  );
}
