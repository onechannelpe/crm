import { For, Show, createMemo, type JSX } from "solid-js";

import { SELECTION_COLUMN_WIDTH } from "../hooks/use-data-grid-column-layout";
import {
  buildDataGridTemplateColumns,
  getStickyDataGridColumnIndex,
} from "../hooks/use-data-grid-column-layout";
import type { DataGridSelectionModel } from "../hooks/use-data-grid-selection";
import type {
  DataGridActionRowConfig,
  DataGridColumn,
} from "../model/data-grid-types";
import { DataGridActionRow } from "./data-grid-action-row";
import { DataGridHeader } from "./data-grid-header";
import { DataGridRow } from "./data-grid-row";

import styles from "../styles/data-grid.module.css";

export function DataGrid<T extends { id: number }>(props: {
  actionRow?: DataGridActionRowConfig;
  ariaLabel: string;
  columns: DataGridColumn<T>[];
  draftRow?: JSX.Element;
  emptyState: JSX.Element;
  onRowClick: (row: T) => void;
  rows: T[];
  selection: DataGridSelectionModel;
}) {
  const gridTemplateColumns = createMemo(() =>
    buildDataGridTemplateColumns(props.columns),
  );
  const stickyColumnIndex = createMemo(() =>
    getStickyDataGridColumnIndex(props.columns),
  );

  return (
    <div class={styles.indexContainer}>
      <div class={styles.tableContainer}>
        <div class={styles.scrollWrapper}>
          <section class={styles.table} aria-label={props.ariaLabel}>
            <DataGridHeader
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
                  <DataGridRow
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
                <DataGridActionRow
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
          </section>
        </div>
      </div>
    </div>
  );
}
