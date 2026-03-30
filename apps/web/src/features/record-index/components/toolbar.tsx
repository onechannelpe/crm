import { For, Show } from "solid-js";

import List from "~/components/icons/list";
import { DataGridToolbar } from "~/features/data-grid/components/toolbar";
import { DataGridToolbarMenu } from "~/features/data-grid/components/toolbar-menu";

import type { RecordIndexScreenModel } from "../model/types";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

export function RecordIndexToolbar<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { model: RecordIndexScreenModel<T, TFilterValue, TSortValue> }) {
  const PickerIcon = props.model.adapter.pickerIcon ?? List;

  return (
    <DataGridToolbar
      picker={{
        icon: PickerIcon,
        label: props.model.adapter.title,
        count: props.model.count(),
      }}
      rightContent={
        <>
          <Show when={props.model.adapter.filter}>
            {(filter) => (
              <DataGridToolbarMenu
                active={props.model.filtering.isActive()}
                label={filter().label}
                menuId={filter().menuId}
                open={props.model.columns.openMenu() === "filter"}
                onDismiss={() => props.model.columns.setOpenMenu(null)}
                onToggle={() =>
                  props.model.columns.setOpenMenu((current) =>
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
                        props.model.filtering.filterValue() === option.value
                          ? "true"
                          : "false"
                      }
                      aria-checked={
                        props.model.filtering.filterValue() === option.value
                          ? "true"
                          : "false"
                      }
                      onClick={() => {
                        props.model.filtering.setFilterValue(option.value);
                        props.model.columns.setOpenMenu(null);
                      }}
                    >
                      {option.label}
                    </button>
                  )}
                </For>
              </DataGridToolbarMenu>
            )}
          </Show>
          <Show when={props.model.adapter.sort}>
            {(sort) => (
              <DataGridToolbarMenu
                active={props.model.sorting.isActive()}
                label={sort().label}
                menuId={sort().menuId}
                open={props.model.columns.openMenu() === "sort"}
                onDismiss={() => props.model.columns.setOpenMenu(null)}
                onToggle={() =>
                  props.model.columns.setOpenMenu((current) =>
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
                        props.model.sorting.sortValue() === option.value
                          ? "true"
                          : "false"
                      }
                      aria-checked={
                        props.model.sorting.sortValue() === option.value
                          ? "true"
                          : "false"
                      }
                      onClick={() => {
                        props.model.sorting.setSortValue(option.value);
                        props.model.columns.setOpenMenu(null);
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
            active={props.model.columns.hasHiddenColumns()}
            label="Options"
            menuId="record-index-column-options"
            open={props.model.columns.openMenu() === "options"}
            onDismiss={() => props.model.columns.setOpenMenu(null)}
            onToggle={() =>
              props.model.columns.setOpenMenu((current) =>
                current === "options" ? null : "options",
              )
            }
          >
            <div class={sharedStyles.menuSectionLabel}>Visible fields</div>
            <For each={props.model.adapter.columns}>
              {(column) => (
                <button
                  type="button"
                  class={sharedStyles.menuItem}
                  role="menuitemcheckbox"
                  data-active={
                    props.model.columns.visibleColumnKeys().has(column.key)
                      ? "true"
                      : "false"
                  }
                  aria-checked={
                    props.model.columns.visibleColumnKeys().has(column.key)
                      ? "true"
                      : "false"
                  }
                  onClick={() => props.model.columns.toggleColumn(column.key)}
                >
                  <input
                    checked={props.model.columns
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
          </DataGridToolbarMenu>
        </>
      }
    />
  );
}
