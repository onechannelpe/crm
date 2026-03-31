import { createMemo, type JSX } from "solid-js";

import {
  buildDataGridTemplateColumns,
  getStickyDataGridColumnIndex,
} from "../hooks/use-column-layout";
import { createDataGridInteraction } from "../hooks/use-instance";
import type { DataGridSelectionModel } from "../hooks/use-selection";
import type { DataGridRowOpen } from "../model/row-open";
import type { DataGridActionRowConfig, DataGridColumn } from "../model/types";
import { DataGridContent } from "./content";
import { DataGridWrappers } from "./wrappers";

export function DataGrid<T extends { id: number }>(props: {
  actionRow?: DataGridActionRowConfig;
  ariaLabel: string;
  columns: DataGridColumn<T>[];
  emptyState: JSX.Element;
  isLoading: boolean;
  rowOpen: DataGridRowOpen<T>;
  rows: T[];
  selection?: DataGridSelectionModel;
  suspendEscapeSelectionClear?: boolean;
}) {
  let tableRef: HTMLElement | undefined;

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
    <DataGridWrappers
      getContainer={() => tableRef}
      interaction={interaction}
      rows={props.rows}
      suspendEscapeSelectionClear={props.suspendEscapeSelectionClear ?? false}
    >
      <DataGridContent
        actionRow={props.actionRow}
        ariaLabel={props.ariaLabel}
        columns={props.columns}
        emptyState={props.emptyState}
        isLoading={props.isLoading}
        setContainer={(element) => {
          tableRef = element;
        }}
        gridTemplateColumns={gridTemplateColumns()}
        rowOpen={props.rowOpen}
        rows={props.rows}
        selectable={selectable()}
        selection={props.selection}
        stickyColumnIndex={stickyColumnIndex()}
      />
    </DataGridWrappers>
  );
}
