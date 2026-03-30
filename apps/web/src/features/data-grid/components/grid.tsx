import { For, Show, createMemo, type JSX } from "solid-js";

import { DataGridInstanceProvider } from "../context/instance-context";
import { DataGridEffects } from "../effects/effects";
import { SELECTION_COLUMN_WIDTH } from "../hooks/use-column-layout";
import {
  buildDataGridTemplateColumns,
  getStickyDataGridColumnIndex,
} from "../hooks/use-column-layout";
import { createDataGridInteraction } from "../hooks/use-instance";
import type { DataGridSelectionModel } from "../hooks/use-selection";
import type { DataGridRowOpen } from "../model/row-open";
import type { DataGridActionRowConfig, DataGridColumn } from "../model/types";
import { DataGridActionRow } from "./action-row";
import { DataGridHeader } from "./header";
import { DataGridRow } from "./row";

import styles from "../styles/data-grid.module.css";

export function DataGrid<T extends { id: number }>(props: {
  actionRow?: DataGridActionRowConfig;
  ariaLabel: string;
  columns: DataGridColumn<T>[];
  draftRow?: JSX.Element;
  emptyState: JSX.Element;
  rowOpen: DataGridRowOpen<T>;
  rows: T[];
  selection?: DataGridSelectionModel;
  suspendEscapeSelectionClear?: boolean;
}) {
  const selectable = createMemo(() => props.selection !== undefined);
  const rows = createMemo(() => props.rows);
  const gridTemplateColumns = createMemo(() =>
    buildDataGridTemplateColumns(props.columns, {
      selectable: selectable(),
    }),
  );
  const stickyColumnIndex = createMemo(() =>
    getStickyDataGridColumnIndex(props.columns),
  );
  const interaction = createDataGridInteraction({
    rows,
    rowOpenMode: () => props.rowOpen.mode,
    columnCount: () => props.columns.length,
    selection: props.selection,
  });

  return (
    <DataGridInstanceProvider value={interaction}>
      <div class={styles.indexContainer}>
        <div class={styles.tableContainer}>
          <div class={styles.scrollWrapper}>
            <section class={styles.table} aria-label={props.ariaLabel}>
              <DataGridHeader
                columns={props.columns}
                gridTemplateColumns={gridTemplateColumns()}
                selectable={selectable()}
                allSelected={interaction.allSelected?.()}
                stickyColumnIndex={stickyColumnIndex()}
                stickyLeft={selectable() ? SELECTION_COLUMN_WIDTH : 0}
                onToggleAll={interaction.toggleAll}
              />

              {props.draftRow}
              <DataGridEffects
                rows={props.rows}
                suspendEscapeSelectionClear={props.suspendEscapeSelectionClear}
              />

              <Show when={props.rows.length > 0} fallback={props.emptyState}>
                <For each={props.rows}>
                  {(row) => (
                    <DataGridRow
                      columns={props.columns}
                      gridTemplateColumns={gridTemplateColumns()}
                      selectable={selectable()}
                      row={row}
                      rowOpen={props.rowOpen}
                      stickyColumnIndex={stickyColumnIndex()}
                      stickyLeft={selectable() ? SELECTION_COLUMN_WIDTH : 0}
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
                    stickyLeft={selectable() ? SELECTION_COLUMN_WIDTH : 0}
                  />
                ) : null}
              </Show>
            </section>
          </div>
        </div>
      </div>
    </DataGridInstanceProvider>
  );
}
