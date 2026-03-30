import { For, Show, type Setter } from "solid-js";

import List from "~/components/icons/list";
import { DataGridToolbar } from "~/features/data-grid/components/toolbar";
import { DataGridToolbarMenu } from "~/features/data-grid/components/toolbar-menu";
import type {
  DataGridColumn,
  DataGridIcon,
} from "~/features/data-grid/model/types";

import type { RecordIndexFilterDefinition } from "../model/filter";
import type { RecordIndexSortDefinition } from "../model/sort";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

export function RecordIndexToolbar<
  T,
  TFilterValue extends string,
  TSortValue extends string,
>(props: {
  title: string;
  count: number;
  pickerIcon?: DataGridIcon;
  columns: ReadonlyArray<DataGridColumn<T>>;
  visibleColumnKeys: Set<string>;
  hasHiddenColumns: boolean;
  openMenu: "filter" | "sort" | "options" | null;
  setOpenMenu: Setter<"filter" | "sort" | "options" | null>;
  toggleColumn: (key: string) => void;
  filter?: RecordIndexFilterDefinition<T, TFilterValue>;
  filterValue?: TFilterValue;
  filterActive: boolean;
  onFilterChange?: (value: TFilterValue) => void;
  sort?: RecordIndexSortDefinition<T, TSortValue>;
  sortValue?: TSortValue;
  sortActive: boolean;
  onSortChange?: (value: TSortValue) => void;
}) {
  const PickerIcon = props.pickerIcon ?? List;

  return (
    <DataGridToolbar
      picker={{
        icon: PickerIcon,
        label: props.title,
        count: props.count,
      }}
      rightContent={
        <>
          <Show when={props.filter}>
            {(filter) => (
              <DataGridToolbarMenu
                active={props.filterActive}
                label={filter().label}
                menuId={filter().menuId}
                open={props.openMenu === "filter"}
                onDismiss={() => props.setOpenMenu(null)}
                onToggle={() =>
                  props.setOpenMenu((current) =>
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
                        props.filterValue === option.value ? "true" : "false"
                      }
                      aria-checked={
                        props.filterValue === option.value ? "true" : "false"
                      }
                      onClick={() => {
                        props.onFilterChange?.(option.value);
                        props.setOpenMenu(null);
                      }}
                    >
                      {option.label}
                    </button>
                  )}
                </For>
              </DataGridToolbarMenu>
            )}
          </Show>
          <Show when={props.sort}>
            {(sort) => (
              <DataGridToolbarMenu
                active={props.sortActive}
                label={sort().label}
                menuId={sort().menuId}
                open={props.openMenu === "sort"}
                onDismiss={() => props.setOpenMenu(null)}
                onToggle={() =>
                  props.setOpenMenu((current) =>
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
                        props.sortValue === option.value ? "true" : "false"
                      }
                      aria-checked={
                        props.sortValue === option.value ? "true" : "false"
                      }
                      onClick={() => {
                        props.onSortChange?.(option.value);
                        props.setOpenMenu(null);
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
            active={props.hasHiddenColumns}
            label="Options"
            menuId="record-index-column-options"
            open={props.openMenu === "options"}
            onDismiss={() => props.setOpenMenu(null)}
            onToggle={() =>
              props.setOpenMenu((current) =>
                current === "options" ? null : "options",
              )
            }
          >
            <div class={sharedStyles.menuSectionLabel}>Visible fields</div>
            <For each={props.columns}>
              {(column) => (
                <button
                  type="button"
                  class={sharedStyles.menuItem}
                  role="menuitemcheckbox"
                  data-active={
                    props.visibleColumnKeys.has(column.key) ? "true" : "false"
                  }
                  aria-checked={
                    props.visibleColumnKeys.has(column.key) ? "true" : "false"
                  }
                  onClick={() => props.toggleColumn(column.key)}
                >
                  <input
                    checked={props.visibleColumnKeys.has(column.key)}
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
