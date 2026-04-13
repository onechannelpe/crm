import { For, Show } from "solid-js";

import { DataGridToolbarMenu } from "~/features/data-grid/components/toolbar-menu";

import { useRecordIndexModelContext } from "../context/model-context";
import { useRecordIndexSetup } from "../context/setup-context";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

export function RecordIndexViewBar() {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();

  return (
    <>
      <Show when={setup.filter}>
        {(filter) => (
          <DataGridToolbarMenu
            active={model.filtering.isActive()}
            label={filter().label}
            menuId={filter().menuId}
            open={model.columns.openMenu() === "filter"}
            onDismiss={() => model.columns.setOpenMenu(null)}
            onToggle={() =>
              model.columns.setOpenMenu((current) =>
                current === "filter" ? null : "filter",
              )
            }
          >
            <For each={filter().options}>
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
                    model.columns.setOpenMenu(null);
                  }}
                >
                  {option.label}
                </button>
              )}
            </For>
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
            onDismiss={() => model.columns.setOpenMenu(null)}
            onToggle={() =>
              model.columns.setOpenMenu((current) =>
                current === "sort" ? null : "sort",
              )
            }
          >
            <For each={sort().options}>
              {(option) => (
                <button
                  type="button"
                  class={sharedStyles.menuItem}
                  role="menuitemradio"
                  data-active={
                    model.sorting.sortValue() === option.value
                      ? "true"
                      : "false"
                  }
                  aria-checked={
                    model.sorting.sortValue() === option.value
                      ? "true"
                      : "false"
                  }
                  onClick={() => {
                    model.sorting.setSortValue(option.value);
                    model.columns.setOpenMenu(null);
                  }}
                >
                  {option.label}
                </button>
              )}
            </For>
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
        <div class={sharedStyles.menuSectionLabel}>Visible fields</div>
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
                checked={model.columns.visibleColumnKeys().has(column.key)}
                class={sharedStyles.menuCheckbox}
                type="checkbox"
                aria-hidden="true"
                tabIndex={-1}
              />
              <span>{column.label}</span>
            </button>
          )}
        </For>
        <Show when={setup.exportAction}>
          {(exportAction) => (
            <>
              <div class={sharedStyles.menuSectionLabel}>Acciones</div>
              <button
                type="button"
                class={sharedStyles.menuItem}
                onClick={() => {
                  model.columns.setOpenMenu(null);
                  void exportAction()();
                }}
              >
                Exportar
              </button>
            </>
          )}
        </Show>
      </DataGridToolbarMenu>
    </>
  );
}
