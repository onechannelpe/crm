import { createMemo, createSignal, For, Show } from "solid-js";

import CalendarClock from "~/components/icons/calendar-clock";
import Info from "~/components/icons/info";
import List from "~/components/icons/list";
import Search from "~/components/icons/search";
import Target from "~/components/icons/target";
import { DataGridToolbarMenu } from "~/features/data-grid/components/toolbar-menu";
import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

import { useRecordIndexModelContext } from "../../context/model-context";
import { useRecordIndexSetup } from "../../context/setup-context";

import { DropdownMenuHeader } from "./menu-primitives";
import type { FilterFieldId, MenuOption } from "./types";

type FilterMenuProps = {
  isOpen: boolean;
  onToggle: () => void;
  onDismiss: () => void;
};

export function FilterMenu(props: FilterMenuProps) {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();

  const [filterSearch, setFilterSearch] = createSignal("");
  const [filterField, setFilterField] = createSignal<FilterFieldId | null>(null);

  const normalizedFilterSearch = createMemo(() =>
    filterSearch().trim().toLocaleLowerCase(),
  );

  const filterOptions = createMemo(() => setup.filter?.options ?? []);
  const stageOptions = createMemo(() =>
    filterOptions().filter((option) => option.value.startsWith("stage:")),
  );
  const statusOptions = createMemo(() =>
    filterOptions().filter((option) => option.value.startsWith("status:")),
  );

  const filterFields = createMemo(
    () =>
      [
        { id: "modified", label: "Ultima modificacion", icon: CalendarClock },
        { id: "stage", label: "Etapa comercial", icon: Target },
        { id: "status", label: "Estado operativo", icon: Info },
      ] as const,
  );

  const filteredFilterFields = createMemo(() =>
    filterFields().filter((field) =>
      field.label.toLocaleLowerCase().includes(normalizedFilterSearch()),
    ),
  );

  function resetFilterMenuState() {
    setFilterSearch("");
    setFilterField(null);
  }

  function closeMenu() {
    props.onDismiss();
  }

  function renderFilterValueList() {
    const field = filterField();

    if (field === "modified") {
      const modifiedOptions: MenuOption[] = [
        { value: "updated_today", label: "Hoy" },
        { value: "all", label: "Cualquier fecha" },
      ];

      return (
        <>
          <div class={sharedStyles.menuGroupLabel}>Valores</div>
          <div class={sharedStyles.menuListbox} role="listbox">
            <For each={modifiedOptions}>
              {(option) => (
                <button
                  type="button"
                  class={sharedStyles.menuItem}
                  role="menuitemradio"
                  data-active={
                    model.filtering.filterValue() === option.value
                      ? "true"
                      : "false"
                  }
                  aria-checked={
                    model.filtering.filterValue() === option.value
                      ? "true"
                      : "false"
                  }
                  onClick={() => {
                    model.filtering.setFilterValue(option.value);
                    resetFilterMenuState();
                    closeMenu();
                  }}
                >
                  <span class={sharedStyles.menuItemIcon}>
                    <CalendarClock size={16} />
                  </span>
                  <span>{option.label}</span>
                </button>
              )}
            </For>
          </div>
        </>
      );
    }

    if (field === "stage") {
      return (
        <>
          <div class={sharedStyles.menuGroupLabel}>Valores</div>
          <div class={sharedStyles.menuListbox} role="listbox">
            <For each={stageOptions()}>
              {(option) => (
                <button
                  type="button"
                  class={sharedStyles.menuItem}
                  role="menuitemradio"
                  data-active={
                    model.filtering.filterValue() === option.value
                      ? "true"
                      : "false"
                  }
                  aria-checked={
                    model.filtering.filterValue() === option.value
                      ? "true"
                      : "false"
                  }
                  onClick={() => {
                    model.filtering.setFilterValue(option.value);
                    resetFilterMenuState();
                    closeMenu();
                  }}
                >
                  <span class={sharedStyles.menuItemIcon}>
                    <Target size={16} />
                  </span>
                  <span>{option.label}</span>
                </button>
              )}
            </For>
          </div>
        </>
      );
    }

    if (field === "status") {
      return (
        <>
          <div class={sharedStyles.menuGroupLabel}>Valores</div>
          <div class={sharedStyles.menuListbox} role="listbox">
            <For each={statusOptions()}>
              {(option) => (
                <button
                  type="button"
                  class={sharedStyles.menuItem}
                  role="menuitemradio"
                  data-active={
                    model.filtering.filterValue() === option.value
                      ? "true"
                      : "false"
                  }
                  aria-checked={
                    model.filtering.filterValue() === option.value
                      ? "true"
                      : "false"
                  }
                  onClick={() => {
                    model.filtering.setFilterValue(option.value);
                    resetFilterMenuState();
                    closeMenu();
                  }}
                >
                  <span class={sharedStyles.menuItemIcon}>
                    <Info size={16} />
                  </span>
                  <span>{option.label}</span>
                </button>
              )}
            </For>
          </div>
        </>
      );
    }

    return null;
  }

  return (
    <Show when={setup.filter}>
      {(filter) => (
        <DataGridToolbarMenu
          active={model.filtering.isActive()}
          label={filter().label}
          menuId={filter().menuId}
          open={props.isOpen}
          onDismiss={() => {
            resetFilterMenuState();
            props.onDismiss();
          }}
          onToggle={() => {
            if (!props.isOpen) {
              resetFilterMenuState();
            }
            props.onToggle();
          }}
        >
          <DropdownMenuHeader
            title={filterField() ? "Configurar filtro" : "Filtrar"}
            onClose={() => {
              resetFilterMenuState();
              closeMenu();
            }}
            onBack={filterField() ? () => setFilterField(null) : undefined}
          />
          <Show
            when={!filterField()}
            fallback={
              <div class={sharedStyles.menuScrollable}>
                {renderFilterValueList()}
              </div>
            }
          >
            <input
              type="search"
              class={sharedStyles.menuSearchInput}
              value={filterSearch()}
              placeholder="Buscar campos"
              onInput={(event) => setFilterSearch(event.currentTarget.value)}
            />
            <div class={sharedStyles.menuScrollable}>
              <div class={sharedStyles.menuGroupLabel}>Campos disponibles</div>
              <div class={sharedStyles.menuListbox} role="listbox">
                <For each={filteredFilterFields()}>
                  {(fieldOption) => {
                    const FieldIcon = fieldOption.icon;
                    return (
                      <button
                        type="button"
                        class={sharedStyles.menuItem}
                        onClick={() => setFilterField(fieldOption.id)}
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
              <div class={sharedStyles.menuListbox} role="listbox">
                <button
                  type="button"
                  class={sharedStyles.menuItem}
                  onClick={() => {
                    model.filtering.setFilterValue("all");
                    resetFilterMenuState();
                    closeMenu();
                  }}
                >
                  <span class={sharedStyles.menuItemIcon}>
                    <List size={16} />
                  </span>
                  <span>Quitar filtros</span>
                </button>
                <button type="button" class={sharedStyles.menuItem}>
                  <span class={sharedStyles.menuItemIcon}>
                    <Search size={16} />
                  </span>
                  <span>Buscar en cualquier campo</span>
                </button>
              </div>
            </div>
          </Show>
        </DataGridToolbarMenu>
      )}
    </Show>
  );
}
