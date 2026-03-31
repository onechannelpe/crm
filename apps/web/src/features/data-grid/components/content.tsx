import { Show, type JSX } from "solid-js";

import { SELECTION_COLUMN_WIDTH } from "../hooks/use-column-layout";
import type { DataGridSelectionModel } from "../hooks/use-selection";
import type { DataGridRowOpen } from "../model/row-open";
import type { DataGridActionRowConfig, DataGridColumn } from "../model/types";
import { DataGridBody } from "./body";
import { DataGridHeader } from "./header";
import { DataGridLoadingState } from "./loading-state";

import styles from "../styles/data-grid.module.css";

export function DataGridContent<T extends { id: number }>(props: {
  actionRow?: DataGridActionRowConfig;
  ariaLabel: string;
  columns: DataGridColumn<T>[];
  emptyState: JSX.Element;
  isLoading: boolean;
  setContainer: (element: HTMLElement) => void;
  gridTemplateColumns: string;
  rowOpen: DataGridRowOpen<T>;
  rows: T[];
  selectable: boolean;
  selection?: DataGridSelectionModel;
  stickyColumnIndex: number;
}) {
  const stickyLeft = () => (props.selectable ? SELECTION_COLUMN_WIDTH : 0);

  return (
    <div class={styles.indexContainer}>
      <div class={styles.tableContainer}>
        <div class={styles.scrollWrapper}>
          <section
            ref={props.setContainer}
            class={styles.table}
            aria-label={props.ariaLabel}
            aria-colcount={props.columns.length + (props.selectable ? 1 : 0)}
            aria-multiselectable={props.selectable ? "true" : undefined}
            aria-rowcount={props.rows.length + 1}
            role="grid"
          >
            <DataGridHeader
              columns={props.columns}
              gridTemplateColumns={props.gridTemplateColumns}
              selectable={props.selectable}
              allSelected={props.selection?.allSelected()}
              stickyColumnIndex={props.stickyColumnIndex}
              stickyLeft={stickyLeft()}
              onToggleAll={props.selection?.toggleAll}
            />

            <Show when={!props.isLoading} fallback={<DataGridLoadingState />}>
              <Show when={props.rows.length > 0} fallback={props.emptyState}>
                <DataGridBody
                  actionRow={props.actionRow}
                  columns={props.columns}
                  gridTemplateColumns={props.gridTemplateColumns}
                  rowOpen={props.rowOpen}
                  rows={props.rows}
                  selectable={props.selectable}
                  stickyColumnIndex={props.stickyColumnIndex}
                  stickyLeft={stickyLeft()}
                />
              </Show>
            </Show>
          </section>
        </div>
      </div>
    </div>
  );
}
