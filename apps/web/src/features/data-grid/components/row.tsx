import { For, Match, Show, Switch } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { Checkbox } from "~/components/ui/input/checkbox";

import { useDataGrid } from "../context/instance-context";
import type { DataGridColumn, DataGridRowOpenIndicator } from "../model/types";
import { DataGridCell } from "./cell";

import styles from "../styles/table.module.css";

export function DataGridRow<T extends { id: string }>(props: {
  columns: ReadonlyArray<DataGridColumn<T>>;
  ariaRowIndex: number;
  onRowOpen?: (row: T) => void;
  rowOrderIndex: number;
  rowOpenIndicator?: DataGridRowOpenIndicator;
  row: T;
  stickyColumnIndex: number;
}) {
  const grid = useDataGrid();

  return (
    <div
      class={styles.bodyRow}
      data-grid-row-id={props.row.id}
      data-grid-row-index={props.rowOrderIndex}
      data-selectable-id={grid.selection ? props.row.id : undefined}
      aria-rowindex={props.ariaRowIndex}
      aria-selected={
        grid.selection
          ? grid.selection.isSelected(props.row.id)
            ? "true"
            : "false"
          : undefined
      }
      data-active={grid.focus.isRowActive(props.row.id) ? "true" : "false"}
      data-dragged={grid.reorder?.isDragged(props.row.id) ? "true" : "false"}
      data-drop-target={
        grid.reorder?.isDropTarget(props.row.id) ? "true" : "false"
      }
      data-focused={grid.focus.isRowFocused(props.row.id) ? "true" : "false"}
      role="row"
    >
      <Show when={grid.reorder}>
        {(reorder) => (
          <div
            class={`${styles.bodyCell} ${styles.reorderCell}`}
            role="gridcell"
          >
            <button
              type="button"
              class={styles.reorderHandle}
              data-grid-reorder-handle="true"
              data-select-disable="true"
              aria-label="Reordenar fila"
              disabled={!grid.isInteractive()}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                reorder().begin({
                  rowId: props.row.id,
                  rowIndex: props.rowOrderIndex,
                  pointerId: event.pointerId,
                  clientY: event.clientY,
                });
              }}
            >
              <span class={styles.reorderDots} aria-hidden="true" />
            </button>
          </div>
        )}
      </Show>
      <Show when={grid.selection}>
        {(selection) => (
          <div
            class={`${styles.bodyCell} ${styles.checkboxCell}`}
            data-selection-cell="true"
            data-select-disable="true"
            role="gridcell"
          >
            <Checkbox
              aria-label="Seleccionar fila"
              checked={selection().isSelected(props.row.id)}
              disabled={!grid.isInteractive()}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                selection().setSelected(
                  props.row.id,
                  event.currentTarget.checked,
                )
              }
            />
          </div>
        )}
      </Show>
      <For each={props.columns}>
        {(column, index) => (
          <DataGridRowCell
            column={column}
            onRowOpen={props.onRowOpen}
            row={props.row}
            rowOpenIndicator={props.rowOpenIndicator}
            sticky={index() === props.stickyColumnIndex}
          />
        )}
      </For>
    </div>
  );
}

function DataGridRowCell<T extends { id: string }>(props: {
  column: DataGridColumn<T>;
  onRowOpen?: (row: T) => void;
  row: T;
  rowOpenIndicator?: DataGridRowOpenIndicator;
  sticky: boolean;
}) {
  const grid = useDataGrid();
  const editable = () => props.column.edit !== undefined;
  const activatable = () => editable() || props.onRowOpen !== undefined;
  const showOpenHint = () =>
    !editable() && props.onRowOpen !== undefined && props.sticky;

  function activateCell(anchor: HTMLElement) {
    if (grid.activation.suppressed()) {
      grid.activation.clearSuppression();
      return;
    }

    if (editable()) {
      grid.focus.openEditor(props.row.id, props.column.key, anchor);
      return;
    }

    if (props.onRowOpen) {
      grid.focus.activateRow(props.row.id);
      props.onRowOpen(props.row);
    }
  }

  return (
    <DataGridCell
      sticky={props.sticky}
      role="gridcell"
      ref={(element) => {
        element.dataset.gridRowId = props.row.id;
        element.dataset.gridColumnKey = props.column.key;
      }}
      data-grid-focusable-cell="true"
      tabIndex={
        grid.isInteractive()
          ? grid.focus.getCellTabIndex(props.row.id, props.column.key)
          : -1
      }
      onClick={(event) => {
        if (
          !grid.isInteractive() ||
          !activatable() ||
          isNestedInteractiveTarget(event)
        ) {
          return;
        }

        activateCell(event.currentTarget);
      }}
      onFocus={() => grid.focus.focusCell(props.row.id, props.column.key)}
      onKeyDown={(event) => {
        grid.focus.handleCellKeyDown(event, props.row.id, props.column.key);
        if (
          !grid.isInteractive() ||
          !activatable() ||
          (event.key !== "Enter" && event.key !== " ")
        ) {
          return;
        }

        event.preventDefault();
        activateCell(event.currentTarget);
      }}
    >
      <div
        class={activatable() ? styles.rowButton : styles.rowContent}
        data-editable={editable() ? "true" : undefined}
      >
        <span class={styles.rowButtonContent}>
          <span class={styles.rowButtonLabel}>
            {props.column.renderCell(props.row)}
          </span>
          <Show when={showOpenHint() && props.rowOpenIndicator}>
            {(indicator) => <DataGridRowOpenHint mode={indicator()} />}
          </Show>
        </span>
      </div>
    </DataGridCell>
  );
}

function isNestedInteractiveTarget(
  event: MouseEvent & { currentTarget: Element },
) {
  const target = event.target;
  return (
    target instanceof Element &&
    target !== event.currentTarget &&
    target.closest("a, button, input, select, textarea, [role='button']") !==
      null
  );
}

function DataGridRowOpenHint(props: { mode: DataGridRowOpenIndicator }) {
  return (
    <Switch>
      <Match when={props.mode === "panel"}>
        <span class={styles.rowOpenHint} aria-hidden="true">
          <LayoutSidebarRightCollapse size={12} />
        </span>
      </Match>
      <Match when={props.mode === "route"}>
        <span class={styles.rowOpenHint} aria-hidden="true">
          <ChevronRight size={12} />
        </span>
      </Match>
    </Switch>
  );
}
