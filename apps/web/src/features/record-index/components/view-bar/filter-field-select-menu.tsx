import { createMemo, createSignal, For, Show } from "solid-js";

import List from "~/components/icons/list";

import { useRecordIndex } from "../../context/record-index-context";
import { AnyFieldSearchMenuItem } from "./any-field-search-menu-item";
import { DropdownMenuHeader } from "./menu-primitives";

import sharedStyles from "../../styles/menu.module.css";

type FilterFieldSelectMenuProps = {
  onClose: () => void;
};

export function FilterFieldSelectMenu(props: FilterFieldSelectMenuProps) {
  const recordIndex = useRecordIndex();
  const [fieldSearch, setFieldSearch] = createSignal("");

  const normalizedFieldSearch = createMemo(() =>
    fieldSearch().trim().toLocaleLowerCase(),
  );

  const filteredFilterFields = createMemo(() =>
    (recordIndex.definition.filter?.catalog.fields ?? []).filter((field) =>
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
        <div class={sharedStyles.menuListbox}>
          <For each={filteredFilterFields()}>
            {(fieldOption) => {
              const FieldIcon = fieldOption.icon;
              return (
                <button
                  type="button"
                  class={sharedStyles.menuItem}
                  onClick={() =>
                    recordIndex.filtering?.setPanel({
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
          <div class={sharedStyles.menuEmptyState}>Sin resultados</div>
        </Show>

        <div class={sharedStyles.menuSeparator} />
        <div class={sharedStyles.menuListbox}>
          <button
            type="button"
            class={sharedStyles.menuItem}
            onClick={() => {
              recordIndex.filtering?.set(
                recordIndex.definition.filter?.catalog.defaultValue,
              );
              recordIndex.search?.set("");
              recordIndex.filtering?.setPanel({ kind: "field-list" });
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
