import { For, Show, createMemo, type JSX } from "solid-js";

import { IndexActionRow } from "./action-row";
import {
  buildGridTemplateColumns,
  getStickyColumnIndex,
  SELECTION_COLUMN_WIDTH,
} from "./grid";
import { IndexHeader } from "./header";
import { IndexRow } from "./row";
import type { SelectionModel } from "./selection";
import type { IndexColumn } from "./types";

import styles from "./styles.module.css";

export function IndexTable<T extends { id: number }>(props: {
  actionRow?: {
    icon: JSX.Element;
    label: string;
    onClick: () => void;
  };
  ariaLabel: string;
  columns: IndexColumn<T>[];
  draftRow?: JSX.Element;
  emptyState: JSX.Element;
  onRowClick: (row: T) => void;
  rows: T[];
  selection: SelectionModel;
}) {
  const gridTemplateColumns = createMemo(() =>
    buildGridTemplateColumns(props.columns),
  );
  const stickyColumnIndex = createMemo(() =>
    getStickyColumnIndex(props.columns),
  );

  return (
    <div class={styles.indexContainer}>
      <div class={styles.tableContainer}>
        <div class={styles.scrollWrapper}>
          <div class={styles.table} role="table" aria-label={props.ariaLabel}>
            <IndexHeader
              allSelected={props.selection.allSelected()}
              columns={props.columns}
              gridTemplateColumns={gridTemplateColumns()}
              stickyColumnIndex={stickyColumnIndex()}
              stickyLeft={SELECTION_COLUMN_WIDTH}
              onToggleAll={props.selection.toggleAll}
            />

            {props.draftRow}

            <Show when={props.rows.length > 0} fallback={props.emptyState}>
              <For each={props.rows}>
                {(row) => (
                  <IndexRow
                    columns={props.columns}
                    gridTemplateColumns={gridTemplateColumns()}
                    onRowClick={props.onRowClick}
                    onSelectionPointerDown={props.selection.beginSelectionDrag}
                    onSelectionPointerEnter={
                      props.selection.updateSelectionDrag
                    }
                    onToggleSelected={props.selection.setSelected}
                    row={row}
                    selected={props.selection.selectedIds().includes(row.id)}
                    stickyColumnIndex={stickyColumnIndex()}
                    stickyLeft={SELECTION_COLUMN_WIDTH}
                  />
                )}
              </For>

              {props.actionRow ? (
                <IndexActionRow
                  gridTemplateColumns={gridTemplateColumns()}
                  icon={props.actionRow.icon}
                  label={props.actionRow.label}
                  labelColumnIndex={Math.max(stickyColumnIndex(), 0)}
                  onClick={props.actionRow.onClick}
                  stickyColumnIndex={stickyColumnIndex()}
                  stickyLeft={SELECTION_COLUMN_WIDTH}
                />
              ) : null}
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
