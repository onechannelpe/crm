import { createMemo } from "solid-js";

import { DataGrid } from "~/features/data-grid/components/grid";
import {
  buildDataGridTemplateColumns,
  getStickyDataGridColumnIndex,
  SELECTION_COLUMN_WIDTH,
} from "~/features/data-grid/hooks/use-column-layout";
import { createDataGridSelection } from "~/features/data-grid/hooks/use-selection";

import { useRecordIndexColumns } from "../hooks/use-columns";
import { useRecordIndexFiltering } from "../hooks/use-filtering";
import { useRecordIndexSorting } from "../hooks/use-sorting";
import type { RecordIndexAdapter } from "../model/types";
import { RecordIndexPage } from "./page";
import { RecordIndexToolbar } from "./toolbar";

export function RecordIndexScreen<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { adapter: RecordIndexAdapter<T, TFilterValue, TSortValue> }) {
  const columns = useRecordIndexColumns(props.adapter.columns);
  const filtering = useRecordIndexFiltering(
    props.adapter.getRows,
    props.adapter.filter,
  );
  const sorting = useRecordIndexSorting(
    filtering.filteredRows,
    props.adapter.sort,
  );

  const selection = createDataGridSelection(sorting.sortedRows);
  const gridTemplateColumns = createMemo(() =>
    buildDataGridTemplateColumns(columns.visibleColumns()),
  );
  const stickyColumnIndex = createMemo(() =>
    getStickyDataGridColumnIndex(columns.visibleColumns()),
  );
  const draftRow = createMemo(() =>
    props.adapter.renderDraftRow?.({
      columns: columns.visibleColumns(),
      gridTemplateColumns: gridTemplateColumns(),
      stickyColumnIndex: stickyColumnIndex(),
      stickyLeft: SELECTION_COLUMN_WIDTH,
    }),
  );
  const count = createMemo(() =>
    props.adapter.getCount
      ? props.adapter.getCount()
      : props.adapter.getRows().length,
  );

  return (
    <RecordIndexPage class={props.adapter.class}>
      <RecordIndexToolbar
        title={props.adapter.title}
        count={count()}
        pickerIcon={props.adapter.pickerIcon}
        columns={props.adapter.columns}
        visibleColumnKeys={columns.visibleColumnKeys()}
        hasHiddenColumns={columns.hasHiddenColumns()}
        openMenu={columns.openMenu()}
        setOpenMenu={columns.setOpenMenu}
        toggleColumn={columns.toggleColumn}
        filter={props.adapter.filter}
        filterValue={filtering.filterValue()}
        filterActive={filtering.isActive()}
        onFilterChange={filtering.setFilterValue}
        sort={props.adapter.sort}
        sortValue={sorting.sortValue()}
        sortActive={sorting.isActive()}
        onSortChange={sorting.setSortValue}
      />

      <DataGrid
        actionRow={props.adapter.actionRow}
        ariaLabel={props.adapter.ariaLabel}
        columns={columns.visibleColumns()}
        draftRow={draftRow()}
        emptyState={props.adapter.emptyState}
        rowOpen={props.adapter.rowOpen}
        rows={sorting.sortedRows()}
        selection={selection}
      />
    </RecordIndexPage>
  );
}
