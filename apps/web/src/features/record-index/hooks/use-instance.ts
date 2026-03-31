import { createMemo } from "solid-js";

import { createDataGridSelection } from "~/features/data-grid/hooks/use-selection";

import { useRecordIndexViewState } from "../context/instance-context";
import {
  applyRecordIndexFilter,
  applyRecordIndexSort,
  createRecordIndexDraftRowRenderContext,
  getVisibleRecordIndexColumns,
  hasHiddenRecordIndexColumns,
  isRecordIndexFilterActive,
  isRecordIndexSortActive,
  resolveRecordIndexOptionValue,
  toggleRecordIndexVisibleColumnKey,
} from "../model/derive";
import type {
  RecordIndexAdapter,
  RecordIndexScreenModel,
} from "../model/types";

export function useRecordIndexModel<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(
  adapter: RecordIndexAdapter<T, TFilterValue, TSortValue>,
): RecordIndexScreenModel<T, TFilterValue, TSortValue> {
  const viewState = useRecordIndexViewState();
  const visibleColumns = createMemo(() =>
    getVisibleRecordIndexColumns(
      adapter.columns,
      viewState.visibleColumnKeys(),
    ),
  );

  function toggleColumn(key: string) {
    viewState.setVisibleColumnKeys((current) =>
      toggleRecordIndexVisibleColumnKey(current, key),
    );
  }

  const hasHiddenColumns = createMemo(() =>
    hasHiddenRecordIndexColumns(adapter.columns, viewState.visibleColumnKeys()),
  );

  const filteredRows = createMemo(() => {
    return applyRecordIndexFilter(
      adapter.getRows(),
      adapter.filter,
      viewState.filterValue(),
    );
  });

  const filterIsActive = createMemo(() => {
    return isRecordIndexFilterActive(adapter.filter, viewState.filterValue());
  });

  const sortedRows = createMemo(() => {
    return applyRecordIndexSort(
      filteredRows(),
      adapter.sort,
      viewState.sortValue(),
    );
  });

  const sortIsActive = createMemo(() => {
    return isRecordIndexSortActive(adapter.sort, viewState.sortValue());
  });

  const selection = adapter.selectable
    ? createDataGridSelection(sortedRows)
    : undefined;
  const draftRow = createMemo(() =>
    adapter.renderDraftRow?.(
      createRecordIndexDraftRowRenderContext(visibleColumns()),
    ),
  );
  const visibleCount = createMemo(() => sortedRows().length);
  const totalCount = createMemo(() => adapter.getTotalCount?.());
  const pickerMeta = createMemo(() => {
    const visible = visibleCount();
    const total = totalCount();

    if (typeof total === "number" && total !== visible) {
      return `${visible} of ${total}`;
    }

    return String(visible);
  });

  return {
    adapter,
    counts: {
      pickerMeta,
      total: totalCount,
      visible: visibleCount,
    },
    columns: {
      openMenu: viewState.openMenu,
      setOpenMenu: viewState.setOpenMenu,
      visibleColumnKeys: viewState.visibleColumnKeys,
      visibleColumns,
      hasHiddenColumns,
      toggleColumn,
    },
    filtering: {
      filterValue: createMemo(() =>
        adapter.filter
          ? resolveRecordIndexOptionValue(
              adapter.filter.options,
              viewState.filterValue(),
            )
          : undefined,
      ),
      setFilterValue: (value) => viewState.setFilterValue(() => value),
      filteredRows,
      isActive: filterIsActive,
    },
    sorting: {
      sortValue: createMemo(() =>
        adapter.sort
          ? resolveRecordIndexOptionValue(
              adapter.sort.options,
              viewState.sortValue(),
            )
          : undefined,
      ),
      setSortValue: (value) => viewState.setSortValue(() => value),
      sortedRows,
      isActive: sortIsActive,
    },
    loading: {
      isInitial: adapter.isLoading,
    },
    selection,
    draftRow,
  };
}
