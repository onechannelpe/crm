import { For, Show, type JSX } from "solid-js";

import { IndexActionRow } from "./action-row";
import { IndexHeader } from "./header";
import { IndexRow } from "./row";
import type { IndexColumn } from "./types";
import styles from "./styles.module.css";

export function IndexTable<T extends { id: number }>(props: {
  actionRow?: {
    icon: JSX.Element;
    label: string;
    onClick: () => void;
  };
  allSelected: boolean;
  ariaLabel: string;
  columns: IndexColumn<T>[];
  draftRow?: JSX.Element;
  emptyState: JSX.Element;
  gridTemplateColumns: string;
  onRowClick: (row: T) => void;
  onSelectionPointerDown: (id: number) => void;
  onSelectionPointerEnter: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
  onToggleSelected: (id: number, checked: boolean) => void;
  rows: T[];
  selectedIds: number[];
  stickyColumnIndex: number;
  stickyLeft: number;
}) {
  return (
    <div class={styles.indexContainer}>
      <div class={styles.tableContainer}>
        <div class={styles.scrollWrapper}>
          <div class={styles.table} role="table" aria-label={props.ariaLabel}>
            <IndexHeader
              allSelected={props.allSelected}
              columns={props.columns}
              gridTemplateColumns={props.gridTemplateColumns}
              stickyColumnIndex={props.stickyColumnIndex}
              stickyLeft={props.stickyLeft}
              onToggleAll={props.onToggleAll}
            />

            {props.draftRow}

            <Show when={props.rows.length > 0} fallback={props.emptyState}>
              <For each={props.rows}>
                {(row) => (
                  <IndexRow
                    columns={props.columns}
                    gridTemplateColumns={props.gridTemplateColumns}
                    onRowClick={props.onRowClick}
                    onSelectionPointerDown={props.onSelectionPointerDown}
                    onSelectionPointerEnter={props.onSelectionPointerEnter}
                    onToggleSelected={props.onToggleSelected}
                    row={row}
                    selected={props.selectedIds.includes(row.id)}
                    stickyColumnIndex={props.stickyColumnIndex}
                    stickyLeft={props.stickyLeft}
                  />
                )}
              </For>

              {props.actionRow ? (
                <IndexActionRow
                  gridTemplateColumns={props.gridTemplateColumns}
                  icon={props.actionRow.icon}
                  label={props.actionRow.label}
                  labelColumnIndex={Math.max(props.stickyColumnIndex, 0)}
                  onClick={props.actionRow.onClick}
                  stickyColumnIndex={props.stickyColumnIndex}
                  stickyLeft={props.stickyLeft}
                />
              ) : null}
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
