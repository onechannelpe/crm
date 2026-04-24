import { createMemo, createSignal, For, Show } from "solid-js";

import Building2 from "~/components/icons/building-2";
import CalendarClock from "~/components/icons/calendar-clock";
import CalendarDays from "~/components/icons/calendar-days";
import ChevronDown from "~/components/icons/chevron-down";
import ChevronUp from "~/components/icons/chevron-up";
import User from "~/components/icons/user";
import { DataGridToolbarMenu } from "~/features/data-grid/components/toolbar-menu";

import { useRecordIndexModelContext } from "../../context/model-context";
import { useRecordIndexSetup } from "../../context/setup-context";
import { DropdownMenuHeader, parseSortDirection } from "./menu-primitives";
import type { SortDirection, SortFieldPrefix } from "./types";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

type SortMenuProps = {
  isOpen: boolean;
  onToggle: () => void;
  onDismiss: () => void;
};

export function SortMenu(props: SortMenuProps) {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();

  const [sortSearch, setSortSearch] = createSignal("");
  const [sortDirection, setSortDirection] = createSignal<SortDirection>("desc");

  const normalizedSortSearch = createMemo(() =>
    sortSearch().trim().toLocaleLowerCase(),
  );

  const sortOptions = createMemo(() => setup.sort?.options ?? []);

  const sortFields = createMemo(
    () =>
      [
        {
          prefix: "createdAt",
          label: "Fecha de registro",
          icon: CalendarDays,
        },
        {
          prefix: "updatedAt",
          label: "Ultima modificacion",
          icon: CalendarClock,
        },
        {
          prefix: "registeredBy",
          label: "Registrado por",
          icon: User,
        },
        {
          prefix: "ruc",
          label: "RUC",
          icon: Building2,
        },
      ] as const,
  );

  const filteredSortFields = createMemo(() =>
    sortFields().filter((field) =>
      field.label.toLocaleLowerCase().includes(normalizedSortSearch()),
    ),
  );

  function resetSortMenuState() {
    setSortSearch("");
    const current = model.sorting.sortValue();
    setSortDirection(parseSortDirection(current));
  }

  function closeMenu() {
    props.onDismiss();
  }

  function selectSortField(prefix: SortFieldPrefix) {
    const directionSuffix = sortDirection() === "asc" ? "_asc" : "_desc";
    const target = sortOptions().find(
      (option) => option.value === `${prefix}${directionSuffix}`,
    );

    if (target) {
      model.sorting.setSortValue(target.value);
    }

    setSortSearch("");
    closeMenu();
  }

  return (
    <Show when={setup.sort}>
      {(sort) => (
        <DataGridToolbarMenu
          active={model.sorting.isActive()}
          label={sort().label}
          menuId={sort().menuId}
          open={props.isOpen}
          onDismiss={() => {
            resetSortMenuState();
            props.onDismiss();
          }}
          onToggle={() => {
            if (!props.isOpen) {
              resetSortMenuState();
            }
            props.onToggle();
          }}
        >
          <DropdownMenuHeader
            title="Ordenar"
            onClose={() => {
              resetSortMenuState();
              closeMenu();
            }}
          />
          <div class={sharedStyles.menuGroupLabel}>Direccion</div>
          <div class={sharedStyles.menuListbox} role="listbox">
            <button
              type="button"
              class={sharedStyles.menuItem}
              role="menuitemradio"
              data-active={sortDirection() === "asc" ? "true" : "false"}
              aria-checked={sortDirection() === "asc" ? "true" : "false"}
              onClick={() => setSortDirection("asc")}
            >
              <span class={sharedStyles.menuItemIcon}>
                <ChevronUp size={16} />
              </span>
              <span>Ascendente</span>
            </button>
            <button
              type="button"
              class={sharedStyles.menuItem}
              role="menuitemradio"
              data-active={sortDirection() === "desc" ? "true" : "false"}
              aria-checked={sortDirection() === "desc" ? "true" : "false"}
              onClick={() => setSortDirection("desc")}
            >
              <span class={sharedStyles.menuItemIcon}>
                <ChevronDown size={16} />
              </span>
              <span>Descendente</span>
            </button>
          </div>
          <input
            type="search"
            class={sharedStyles.menuSearchInput}
            value={sortSearch()}
            placeholder="Buscar campos"
            onInput={(event) => setSortSearch(event.currentTarget.value)}
          />
          <div class={sharedStyles.menuScrollable}>
            <div class={sharedStyles.menuGroupLabel}>Campos ordenables</div>
            <div class={sharedStyles.menuListbox} role="listbox">
              <For each={filteredSortFields()}>
                {(fieldOption) => {
                  const FieldIcon = fieldOption.icon;
                  const isActive = () =>
                    (model.sorting.sortValue() ?? "").startsWith(
                      `${fieldOption.prefix}_`,
                    );

                  return (
                    <button
                      type="button"
                      class={sharedStyles.menuItem}
                      role="menuitemradio"
                      data-active={isActive() ? "true" : "false"}
                      aria-checked={isActive() ? "true" : "false"}
                      onClick={() => selectSortField(fieldOption.prefix)}
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

            <Show when={filteredSortFields().length === 0}>
              <div class={sharedStyles.menuEmptyState}>No results</div>
            </Show>
          </div>
        </DataGridToolbarMenu>
      )}
    </Show>
  );
}
