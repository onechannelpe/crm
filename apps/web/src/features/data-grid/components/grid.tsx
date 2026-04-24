import { createMemo, createSignal, type JSX } from "solid-js";

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
} from "../model/types";
import { DataGridContent } from "./content";
import { DataGridWrappers } from "./wrappers";

export function DataGrid<T extends { id: string }>(props: {
  actionRow?: DataGridActionRowConfig;
  ariaLabel: string;
  columns: DataGridColumn<T>[];
  emptyState: JSX.Element;
  errorState?: JSX.Element;
  onAddColumn?: () => void;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    onNextPage: () => void;
    onPreviousPage: () => void;
  };
  reorder?: DataGridFeatures<T>["reorder"];
  rowOpen: DataGridRowOpen<T>;
  source: DataGridSource<T>;
  selection?: DataGridSelectionModel;
  suspendEscapeSelectionClear?: boolean;
}) {
  const [tableRef, setTableRef] = createSignal<HTMLElement | undefined>();
  const [scrollWrapperRef, setScrollWrapperRef] = createSignal<
    HTMLElement | undefined
  >();

  const selectable = createMemo(() => props.selection !== undefined);
  const reorderable = createMemo(() => props.reorder !== undefined);
  const rows = createMemo(() => props.source.rows);
  const interaction = createDataGridInteraction({
    rows,
    rowOpenMode: () => props.rowOpen.mode,
    columnCount: () => props.columns.length,
    reorder: props.reorder,
    selection: props.selection,
  });
  const gridTemplateColumns = createMemo(() =>
    buildDataGridTemplateColumns(props.columns, {
      reorderable: reorderable(),
      selectable: selectable(),
      columnWidths: interaction.columnWidthOverrides(),
    }),
  );
  const stickyColumnIndex = createMemo(() =>
    getStickyDataGridColumnIndex(props.columns),
  );

  return (
    <DataGridWrappers
      getContainer={tableRef}
      getScrollWrapper={scrollWrapperRef}
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
        setContainer={(el) => setTableRef(el)}
        setScrollWrapper={(el) => setScrollWrapperRef(el)}
        gridTemplateColumns={gridTemplateColumns()}
        onAddColumn={props.onAddColumn}
        pagination={props.pagination}
        onColumnResizeStart={(key, clientX, width) =>
          interaction.beginColumnResize(key, clientX, width)
        }
        rowOpen={props.rowOpen}
        source={props.source}
        selectable={selectable()}
        selection={props.selection}
        stickyColumnIndex={stickyColumnIndex()}
      />
    </DataGridWrappers>
  );
}
