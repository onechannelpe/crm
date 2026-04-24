import { Show, type JSX } from "solid-js";

import {
  REORDER_COLUMN_WIDTH,
  SELECTION_COLUMN_WIDTH,
} from "../hooks/use-column-layout";
import type { DataGridSelectionModel } from "../hooks/use-selection";
import type { DataGridRowOpen } from "../model/row-open";
import type { DataGridSource } from "../model/source";
import type { DataGridActionRowConfig, DataGridColumn } from "../model/types";
import { DataGridBody } from "./body";
import { DataGridHeader } from "./header";
import { DataGridLoadingState } from "./loading-state";

import styles from "../styles/data-grid.module.css";

export function DataGridContent<T extends { id: string }>(props: {
  actionRow?: DataGridActionRowConfig;
  ariaLabel: string;
  columns: DataGridColumn<T>[];
  emptyState: JSX.Element;
  errorState?: JSX.Element;
  reorderable: boolean;
  setContainer: (element: HTMLElement) => void;
  setScrollWrapper: (element: HTMLElement) => void;
  gridTemplateColumns: string;
  onAddColumn?: () => void;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    onNextPage: () => void;
    onPreviousPage: () => void;
  };
  onColumnResizeStart: (
    key: string,
    clientX: number,
    currentWidth: number,
  ) => void;
  rowOpen: DataGridRowOpen<T>;
  source: DataGridSource<T>;
  selectable: boolean;
  selection?: DataGridSelectionModel;
  stickyColumnIndex: number;
}) {
  const selectionLeft = () => (props.reorderable ? REORDER_COLUMN_WIDTH : 0);
  const stickyLeft = () =>
    selectionLeft() + (props.selectable ? SELECTION_COLUMN_WIDTH : 0);
  const rows = () => props.source.rows;
  const totalCount = () => props.source.totalCount;
  const isLoading = () => props.source.status === "pending";
  const isError = () => props.source.status === "error";
  const errorState = () => props.errorState ?? <>No se pudo cargar la tabla.</>;
  const paginationStart = () =>
    (props.pagination?.currentPage ?? 0) * (props.pagination?.pageSize ?? 0) +
    1;
  const paginationEnd = () =>
    Math.min(
      (props.pagination?.currentPage ?? 0) * (props.pagination?.pageSize ?? 0) +
        rows().length,
      props.pagination?.totalCount ?? rows().length,
    );
  const hasPreviousPage = () => (props.pagination?.currentPage ?? 0) > 0;
  const hasNextPage = () =>
    props.pagination !== undefined &&
    paginationEnd() < props.pagination.totalCount;
  const shouldShowPagination = () =>
    props.pagination !== undefined && rows().length > 0;

  return (
    <div class={styles.indexContainer}>
      <div class={styles.tableContainer}>
        <div ref={props.setScrollWrapper} class={styles.scrollWrapper}>
          <section
            ref={props.setContainer}
            class={styles.table}
            aria-label={props.ariaLabel}
            aria-colcount={
              props.columns.length +
              (props.selectable ? 1 : 0) +
              (props.reorderable ? 1 : 0)
            }
            aria-multiselectable={props.selectable ? "true" : undefined}
            aria-rowcount={(totalCount() ?? rows().length) + 1}
            role="grid"
          >
            <DataGridHeader
              columns={props.columns}
              gridTemplateColumns={props.gridTemplateColumns}
              reorderable={props.reorderable}
              selectionLeft={selectionLeft()}
              selectable={props.selectable}
              allSelected={props.selection?.allSelected()}
              stickyColumnIndex={props.stickyColumnIndex}
              stickyLeft={stickyLeft()}
              onAddColumn={props.onAddColumn}
              onColumnResizeStart={props.onColumnResizeStart}
              onToggleAll={props.selection?.toggleAll}
            />

            <Show when={!isLoading()} fallback={<DataGridLoadingState />}>
              <Show
                when={!isError()}
                fallback={
                  <div class={styles.emptyStateSurface}>{errorState()}</div>
                }
              >
                <Show
                  when={rows().length > 0}
                  fallback={
                    <div class={styles.emptyStateSurface}>
                      {props.emptyState}
                    </div>
                  }
                >
                  <DataGridBody
                    actionRow={props.actionRow}
                    columns={props.columns}
                    gridTemplateColumns={props.gridTemplateColumns}
                    reorderable={props.reorderable}
                    rowOpen={props.rowOpen}
                    rows={rows()}
                    selectionLeft={selectionLeft()}
                    selectable={props.selectable}
                    stickyColumnIndex={props.stickyColumnIndex}
                    stickyLeft={stickyLeft()}
                  />
                </Show>
              </Show>
            </Show>
          </section>
        </div>
        <Show when={shouldShowPagination()}>
          <div class={styles.paginationBar}>
            <span class={styles.paginationMeta}>
              {paginationStart()}-{paginationEnd()} de{" "}
              {props.pagination?.totalCount ?? rows().length}
            </span>
            <div class={styles.paginationControls}>
              <button
                type="button"
                class={styles.paginationButton}
                disabled={!hasPreviousPage()}
                onClick={() => props.pagination?.onPreviousPage()}
              >
                Anterior
              </button>
              <button
                type="button"
                class={styles.paginationButton}
                disabled={!hasNextPage()}
                onClick={() => props.pagination?.onNextPage()}
              >
                Siguiente
              </button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
