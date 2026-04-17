import { createMemo, type JSX } from "solid-js";

import {
  buildDataGridTemplateColumns,
  getStickyDataGridColumnIndex,
} from "../hooks/use-column-layout";
import { createDataGridInteraction } from "../hooks/use-instance";
import type { DataGridSelectionModel } from "../hooks/use-selection";
import type { DataGridRowOpen } from "../model/row-open";
import type { DataGridSource } from "../model/source";
import type {
  DataGridActionRowConfig,
  DataGridColumn,
  DataGridFeatures,
  DataGridRowId,
} from "../model/types";
import { DataGridContent } from "./content";
import { DataGridWrappers } from "./wrappers";

export function DataGrid<T extends { id: DataGridRowId }>(props: {
  actionRow?: DataGridActionRowConfig;
  ariaLabel: string;
  columns: DataGridColumn<T>[];
  emptyState: JSX.Element;
  errorState?: JSX.Element;
  reorder?: DataGridFeatures<T>["reorder"];
  rowOpen: DataGridRowOpen<T>;
  source: DataGridSource<T>;
  selection?: DataGridSelectionModel;
  suspendEscapeSelectionClear?: boolean;
}) {
  let tableRef: HTMLElement | undefined;
  let scrollWrapperRef: HTMLElement | undefined;

  const selectable = createMemo(() => props.selection !== undefined);
  const reorderable = createMemo(() => props.reorder !== undefined);
  const rows = createMemo(() => props.source.rows);
  const gridTemplateColumns = createMemo(() =>
    buildDataGridTemplateColumns(props.columns, {
      reorderable: reorderable(),
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
    reorder: props.reorder,
    selection: props.selection,
  });

  return (
    <DataGridWrappers
      getContainer={() => tableRef}
      getScrollWrapper={() => scrollWrapperRef}
      interaction={interaction}
      rows={rows()}
      suspendEscapeSelectionClear={props.suspendEscapeSelectionClear ?? false}
    >
      <DataGridContent
        actionRow={props.actionRow}
        ariaLabel={props.ariaLabel}
        columns={props.columns}
        emptyState={props.emptyState}
        errorState={props.errorState}
        reorderable={reorderable()}
        setContainer={(element) => {
          tableRef = element;
        }}
        setScrollWrapper={(element) => {
          scrollWrapperRef = element;
        }}
        gridTemplateColumns={gridTemplateColumns()}
        rowOpen={props.rowOpen}
        source={props.source}
        selectable={selectable()}
        selection={props.selection}
        stickyColumnIndex={stickyColumnIndex()}
      />
    </DataGridWrappers>
  );
}
