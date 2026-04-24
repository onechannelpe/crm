import { For, Show, createMemo, createSignal } from "solid-js";

import Building2 from "~/components/icons/building-2";
import CalendarClock from "~/components/icons/calendar-clock";
import CalendarDays from "~/components/icons/calendar-days";
import ChevronDown from "~/components/icons/chevron-down";
import ChevronLeft from "~/components/icons/chevron-left";
import ChevronRight from "~/components/icons/chevron-right";
import ChevronUp from "~/components/icons/chevron-up";
import Info from "~/components/icons/info";
import Link from "~/components/icons/link";
import List from "~/components/icons/list";
import Search from "~/components/icons/search";
import Target from "~/components/icons/target";
import User from "~/components/icons/user";
import X from "~/components/icons/x";
import { DataGridToolbarMenu } from "~/features/data-grid/components/toolbar-menu";

import { useRecordIndexModelContext } from "../context/model-context";
import { useRecordIndexSetup } from "../context/setup-context";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

type MenuOption = {
  label: string;
  value: string;
};

type FilterFieldId = "modified" | "stage" | "status";
type SortFieldPrefix = "createdAt" | "updatedAt" | "registeredBy" | "ruc";
type SortDirection = "asc" | "desc";

function DropdownMenuHeader(props: {
  onClose: () => void;
  title: string;
  onBack?: () => void;
}) {
  return (
    <div class={sharedStyles.menuHeader}>
      <Show
        when={props.onBack}
        fallback={
          <button
            type="button"
            class={sharedStyles.menuHeaderCloseButton}
            aria-label="Cerrar"
            onClick={props.onClose}
          >
            <X size={14} />
          </button>
        }
      >
        {(onBack) => (
          <button
            type="button"
            class={sharedStyles.menuHeaderCloseButton}
            aria-label="Volver"
            onClick={onBack()}
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </Show>
      <span class={sharedStyles.menuHeaderTitle}>{props.title}</span>
    </div>
  );
}

function parseSortDirection(value: string | undefined): SortDirection {
  if (value?.endsWith("_asc")) {
    return "asc";
  }
  return "desc";
}

type OptionsContentId = "menu" | "fields";

function RecordIndexOptionsDropdownContent(props: { onClose: () => void }) {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();
  const [contentId, setContentId] = createSignal<OptionsContentId>("menu");

  const visibleFieldsCount = () => model.columns.visibleColumnKeys().size;
  const optionActions = () => setup.actions ?? [];

  async function copyViewLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      props.onClose();
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  }

  return (
    <Show
      when={contentId() === "menu"}
      fallback={
        <>
          <DropdownMenuHeader
            title="Columnas"
            onClose={props.onClose}
            onBack={() => setContentId("menu")}
          />
          <div class={sharedStyles.menuScrollable}>
            <div class={sharedStyles.menuGroupLabel}>Columnas de la tabla</div>
            <div class={sharedStyles.menuListbox} role="listbox">
              <For each={setup.columns}>
                {(column) => (
                  <button
                    type="button"
                    class={sharedStyles.menuItem}
                    role="menuitemcheckbox"
                    data-active={
                      model.columns.visibleColumnKeys().has(column.key)
                        ? "true"
                        : "false"
                    }
                    aria-checked={
                      model.columns.visibleColumnKeys().has(column.key)
                        ? "true"
                        : "false"
                    }
                    onClick={() => model.columns.toggleColumn(column.key)}
                  >
                    <input
                      checked={model.columns
                        .visibleColumnKeys()
                        .has(column.key)}
                      class={sharedStyles.menuCheckbox}
                      type="checkbox"
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                    <span>{column.label}</span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </>
      }
    >
      <DropdownMenuHeader title="Opciones" onClose={props.onClose} />
      <div class={sharedStyles.menuScrollable}>
        <div class={sharedStyles.menuListbox} role="listbox">
          <button
            type="button"
            class={sharedStyles.menuItem}
            onClick={() => setContentId("fields")}
          >
            <span class={sharedStyles.menuItemIcon}>
              <List size={16} />
            </span>
            <span style={{ flex: 1 }}>Columnas</span>
            <span
              style={{
                color: "var(--t-font-color-tertiary)",
                "margin-right": "4px",
                "font-size": "12px",
              }}
            >
              {visibleFieldsCount()}
            </span>
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            class={sharedStyles.menuItem}
            onClick={() => {
              void copyViewLink();
            }}
          >
            <span class={sharedStyles.menuItemIcon}>
              <Link size={16} />
            </span>
            <span>Copiar enlace de vista</span>
          </button>
        </div>

        <Show when={optionActions().length > 0}>
          <>
            <div class={sharedStyles.menuSeparator} />
            <div class={sharedStyles.menuGroupLabel}>Acciones</div>
            <div class={sharedStyles.menuListbox} role="listbox">
              <For each={optionActions()}>
                {(action) => (
                  <button
                    type="button"
                    class={sharedStyles.menuItem}
                    onClick={() => {
                      props.onClose();
                      void action.onClick();
                    }}
                  >
                    {action.label}
                  </button>
                )}
              </For>
            </div>
          </>
        </Show>
      </div>
    </Show>
  );
}

export function RecordIndexViewBar() {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();

  const [filterSearch, setFilterSearch] = createSignal("");
  const [sortSearch, setSortSearch] = createSignal("");
  const [filterField, setFilterField] = createSignal<FilterFieldId | null>(
    null,
  );
  const [sortDirection, setSortDirection] = createSignal<SortDirection>("desc");

  const normalizedFilterSearch = createMemo(() =>
    filterSearch().trim().toLocaleLowerCase(),
  );
  const normalizedSortSearch = createMemo(() =>
    sortSearch().trim().toLocaleLowerCase(),
  );

  const filterOptions = createMemo(() => setup.filter?.options ?? []);
  const sortOptions = createMemo(() => setup.sort?.options ?? []);

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

  function resetFilterMenuState() {
    setFilterSearch("");
    setFilterField(null);
  }

  function resetSortMenuState() {
    setSortSearch("");
    const current = model.sorting.sortValue();
    setSortDirection(parseSortDirection(current));
  }

  function closeMenu() {
    model.columns.setOpenMenu(null);
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
    <>
      <Show when={setup.filter}>
        {(filter) => (
          <DataGridToolbarMenu
            active={model.filtering.isActive()}
            label={filter().label}
            menuId={filter().menuId}
            open={model.columns.openMenu() === "filter"}
            onDismiss={() => {
              resetFilterMenuState();
              closeMenu();
            }}
            onToggle={() =>
              model.columns.setOpenMenu((current) => {
                const next = current === "filter" ? null : "filter";
                if (next === "filter") {
                  resetFilterMenuState();
                }
                return next;
              })
            }
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
                <div class={sharedStyles.menuGroupLabel}>
                  Campos disponibles
                </div>
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

      <Show when={setup.sort}>
        {(sort) => (
          <DataGridToolbarMenu
            active={model.sorting.isActive()}
            label={sort().label}
            menuId={sort().menuId}
            open={model.columns.openMenu() === "sort"}
            onDismiss={() => {
              resetSortMenuState();
              closeMenu();
            }}
            onToggle={() =>
              model.columns.setOpenMenu((current) => {
                const next = current === "sort" ? null : "sort";
                if (next === "sort") {
                  resetSortMenuState();
                }
                return next;
              })
            }
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

      <DataGridToolbarMenu
        active={model.columns.hasHiddenColumns()}
        label="Opciones"
        menuId={`${setup.id}-column-options`}
        open={model.columns.openMenu() === "options"}
        onDismiss={() => model.columns.setOpenMenu(null)}
        onToggle={() =>
          model.columns.setOpenMenu((current) =>
            current === "options" ? null : "options",
          )
        }
      >
        <RecordIndexOptionsDropdownContent
          onClose={() => model.columns.setOpenMenu(null)}
        />
      </DataGridToolbarMenu>
    </>
  );
}
