import { createSignal, For, Match, Show, Switch } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { Checkbox } from "~/components/ui/input/checkbox";

import { useDataGridInstance } from "../context/instance-context";
import { useDataGridInteractionReady } from "../context/interaction-context";
import type { DataGridRowOpen, DataGridRowOpenMode } from "../model/row-open";
import type { DataGridColumn } from "../model/types";
import { DataGridCell } from "./cell";
import { DataGridCellEditor } from "./cell-editor";

import styles from "../styles/data-grid.module.css";

export function DataGridRow<T extends { id: string }>(props: {
  columns: DataGridColumn<T>[];
  gridTemplateColumns: string;
  reorderable: boolean;
  rowOrderIndex: number;
  selectionLeft: number;
  selectable?: boolean;
  row: T;
  rowOpen: DataGridRowOpen<T>;
  stickyColumnIndex: number;
  stickyLeft: number;
}) {
  const interaction = useDataGridInstance();
  const isInteractive = useDataGridInteractionReady();

  return (
    <div
      class={styles.bodyRow}
      data-grid-row-id={props.row.id}
      data-grid-row-index={props.rowOrderIndex}
      data-selectable-id={props.row.id}
      aria-selected={
        props.selectable === false
          ? undefined
          : interaction.isSelected(props.row.id)
            ? "true"
            : "false"
      }
      data-active={interaction.isRowActive(props.row.id) ? "true" : "false"}
      data-dragged={interaction.isRowDragged(props.row.id) ? "true" : "false"}
      data-drop-target={
        interaction.isRowDropTarget(props.row.id) ? "true" : "false"
      }
      data-focused={interaction.isRowFocused(props.row.id) ? "true" : "false"}
      data-open-mode={props.rowOpen.mode}
      style={{ "grid-template-columns": props.gridTemplateColumns }}
    >
      {props.reorderable ? (
        <div class={`${styles.bodyCell} ${styles.reorderCell}`}>
          <button
            type="button"
            class={styles.reorderHandle}
            data-grid-reorder-handle="true"
            data-select-disable="true"
            aria-label="Reorder row"
            disabled={!isInteractive()}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              interaction.beginRowReorder(
                props.row.id,
                props.rowOrderIndex,
                event.clientY,
              );
            }}
          >
            <span class={styles.reorderDots} aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {props.selectable === false ? null : (
        <div
          class={`${styles.bodyCell} ${styles.checkboxCell}`}
          data-selection-cell="true"
          data-select-disable="true"
          style={
            props.reorderable ? { left: `${props.selectionLeft}px` } : undefined
          }
        >
          <Checkbox
            checked={interaction.isSelected(props.row.id)}
            disabled={!isInteractive()}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              interaction.setSelected?.(
                props.row.id,
                event.currentTarget.checked,
              )
            }
          />
        </div>
      )}
      <For each={props.columns}>
        {(column, index) => (
          <DataGridRowCell
            column={column}
            columnIndex={index()}
            row={props.row}
            rowOpen={props.rowOpen}
            stickyColumnIndex={props.stickyColumnIndex}
            stickyLeft={props.stickyLeft}
          />
        )}
      </For>
    </div>
  );
}

function DataGridRowCell<T extends { id: string }>(props: {
  column: DataGridColumn<T>;
  columnIndex: number;
  row: T;
  rowOpen: DataGridRowOpen<T>;
  stickyColumnIndex: number;
  stickyLeft: number;
}) {
  const interaction = useDataGridInstance();
  const isInteractive = useDataGridInteractionReady();
  const [cellRef, setCellRef] = createSignal<HTMLElement | undefined>();

  const editable = () => props.column.edit !== undefined;
  const isEditing = () =>
    interaction.isCellEditing(props.row.id, props.columnIndex);
  // The row-open chevron belongs to the identifier column, never to an editable
  // one (editable cells edit on click rather than open the record).
  const showOpenHint = () =>
    !editable() &&
    props.columnIndex ===
      (props.stickyColumnIndex >= 0 ? props.stickyColumnIndex : 0);

  function openRow() {
    if (interaction.hasPendingRowOpenSuppression()) {
      interaction.clearPendingRowOpenSuppression();
      return;
    }

    interaction.activateRow(props.row.id);
    props.rowOpen.open(props.row);
  }

  function activateCell() {
    if (editable()) {
      interaction.openCellEditor(props.row.id, props.columnIndex);
      return;
    }

    openRow();
  }

  return (
    <DataGridCell
      sticky={props.columnIndex === props.stickyColumnIndex}
      stickyLeft={props.stickyLeft}
    >
      {props.rowOpen.mode === "none" ? (
        <div class={styles.rowContent}>
          {props.column.renderCell(props.row)}
        </div>
      ) : (
        <div
          ref={(element) => {
            setCellRef(element);
            interaction.registerCellElement(
              props.row.id,
              props.columnIndex,
              element,
            );
          }}
          class={styles.rowButton}
          data-grid-focusable-cell={`${props.row.id}:${props.columnIndex}`}
          data-open-mode={props.rowOpen.mode}
          data-editable={editable() ? "true" : undefined}
          // The focusable cell is a grid-managed composite target. Native buttons
          // would nest inside rendered cell controls and break row-level keyboard routing.
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="button"
          aria-disabled={isInteractive() ? undefined : "true"}
          onClick={() => {
            if (!isInteractive()) {
              return;
            }

            if (interaction.hasPendingRowOpenSuppression()) {
              interaction.clearPendingRowOpenSuppression();
              return;
            }

            activateCell();
          }}
          onFocus={() => interaction.focusCell(props.row.id, props.columnIndex)}
          onKeyDown={(event) => {
            interaction.handleCellKeyDown(
              event,
              props.row.id,
              props.columnIndex,
            );

            if (!isInteractive()) {
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();

              if (interaction.hasPendingRowOpenSuppression()) {
                interaction.clearPendingRowOpenSuppression();
                return;
              }

              activateCell();
            }
          }}
          tabIndex={
            isInteractive()
              ? interaction.getCellTabIndex(props.row.id, props.columnIndex)
              : -1
          }
        >
          <span class={styles.rowButtonContent}>
            <span class={styles.rowButtonLabel}>
              {props.column.renderCell(props.row)}
            </span>
            {showOpenHint() ? (
              <DataGridRowOpenHint mode={props.rowOpen.mode} />
            ) : null}
          </span>

          <Show when={isEditing() && props.column.edit}>
            {(edit) => (
              <DataGridCellEditor
                anchor={cellRef}
                onClose={() => interaction.closeCellEditor()}
              >
                {edit().renderEditor({
                  row: props.row,
                  close: () => interaction.closeCellEditor(),
                })}
              </DataGridCellEditor>
            )}
          </Show>
        </div>
      )}
    </DataGridCell>
  );
}

function DataGridRowOpenHint(props: { mode: DataGridRowOpenMode }) {
  return (
    <Switch>
      <Match when={props.mode === "panel"}>
        <span class={styles.rowOpenHint} aria-hidden="true">
          <LayoutSidebarRightCollapse size={12} />
        </span>
      </Match>
      <Match when={props.mode === "route" || props.mode === "inline"}>
        <span class={styles.rowOpenHint} aria-hidden="true">
          <ChevronRight size={12} />
        </span>
      </Match>
    </Switch>
  );
}
