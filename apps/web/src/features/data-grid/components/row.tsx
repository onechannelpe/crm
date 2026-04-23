import { For } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { Checkbox } from "~/components/ui/input/checkbox";

import { useDataGridInstance } from "../context/instance-context";
import { useDataGridInteractionReady } from "../context/interaction-context";
import type { DataGridRowOpen, DataGridRowOpenMode } from "../model/row-open";
import type { DataGridColumn } from "../model/types";
import { DataGridCell } from "./cell";

import styles from "../styles/data-grid.module.css";

export function DataGridRow<T extends { id: string }>(props: {
  columns: DataGridColumn<T>[];
  gridTemplateColumns: string;
  reorderable: boolean;
  rowIndex: number;
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
      role="row"
      data-grid-row-id={props.row.id}
      data-grid-row-index={props.rowOrderIndex}
      data-selectable-id={props.row.id}
      aria-rowindex={props.rowIndex}
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
        <div
          class={`${styles.bodyCell} ${styles.reorderCell}`}
          aria-colindex={1}
          role="gridcell"
        >
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
          aria-colindex={props.reorderable ? 2 : 1}
          data-selection-cell="true"
          data-select-disable="true"
          role="gridcell"
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
          <DataGridCell
            ariaColIndex={
              index() + (props.selectable ? 2 : 1) + (props.reorderable ? 1 : 0)
            }
            role="gridcell"
            sticky={index() === props.stickyColumnIndex}
            stickyLeft={props.stickyLeft}
          >
            {props.rowOpen.mode === "none" ? (
              <div class={styles.rowContent}>
                {column.renderCell(props.row)}
              </div>
            ) : (
              <div
                ref={(element) =>
                  interaction.registerCellElement(
                    props.row.id,
                    index(),
                    element,
                  )
                }
                class={styles.rowButton}
                data-grid-focusable-cell={`${props.row.id}:${index()}`}
                data-open-mode={props.rowOpen.mode}
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

                  interaction.activateRow(props.row.id);
                  props.rowOpen.open(props.row);
                }}
                onFocus={() => interaction.focusCell(props.row.id, index())}
                onKeyDown={(event) => {
                  interaction.handleCellKeyDown(event, props.row.id, index());

                  if (!isInteractive()) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();

                    if (interaction.hasPendingRowOpenSuppression()) {
                      interaction.clearPendingRowOpenSuppression();
                      return;
                    }

                    interaction.activateRow(props.row.id);
                    props.rowOpen.open(props.row);
                  }
                }}
                tabIndex={
                  isInteractive()
                    ? interaction.getCellTabIndex(props.row.id, index())
                    : -1
                }
              >
                <span class={styles.rowButtonContent}>
                  <span class={styles.rowButtonLabel}>
                    {column.renderCell(props.row)}
                  </span>
                  {index() === props.columns.length - 1 ? (
                    <DataGridRowOpenHint mode={props.rowOpen.mode} />
                  ) : null}
                </span>
              </div>
            )}
          </DataGridCell>
        )}
      </For>
    </div>
  );
}

function DataGridRowOpenHint(props: { mode: DataGridRowOpenMode }) {
  if (props.mode === "panel") {
    return (
      <span class={styles.rowOpenHint} aria-hidden="true">
        <LayoutSidebarRightCollapse size={14} />
      </span>
    );
  }

  if (props.mode === "route" || props.mode === "inline") {
    return (
      <span class={styles.rowOpenHint} aria-hidden="true">
        <ChevronRight size={14} />
      </span>
    );
  }

  return null;
}
