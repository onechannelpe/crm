import { createEffect, createMemo } from "solid-js";

import { createDataGridSelection } from "~/features/data-grid/hooks/use-selection";

import { useRecordIndexViewState } from "../context/instance-context";
import { useRecordIndexSetup } from "../context/setup-context";
import {
  applyRecordIndexFilter,
  applyRecordIndexSort,
  getVisibleRecordIndexColumns,
  hasHiddenRecordIndexColumns,
  isRecordIndexFilterActive,
  isRecordIndexSortActive,
  resolveRecordIndexOptionValue,
  toggleRecordIndexVisibleColumnKey,
} from "../model/derive";
import type {
  RecordIndexModel,
  RecordIndexAdapter,
  RecordIndexScreenModel,
} from "../model/types";

export function useRecordIndexModel<
  T extends { id: string },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(
  adapter: RecordIndexAdapter<T, TFilterValue, TSortValue>,
): RecordIndexScreenModel<T, TFilterValue, TSortValue> {
  const setup = useRecordIndexSetup();
  const viewState = useRecordIndexViewState();
  const source = createMemo(() => adapter.source());
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
    if (adapter.serverManagedFiltering) {
      return source().rows;
    }

    return applyRecordIndexFilter(source().rows, adapter.filter, viewState.filterValue());
  });

  const filterIsActive = createMemo(() => {
    return isRecordIndexFilterActive(adapter.filter, viewState.filterValue());
  });

  const sortedRows = createMemo(() => {
    if (adapter.serverManagedSorting) {
      return filteredRows();
    }

    return applyRecordIndexSort(filteredRows(), adapter.sort, viewState.sortValue());
  });

  const sortIsActive = createMemo(() => {
    return isRecordIndexSortActive(adapter.sort, viewState.sortValue());
  });

  createEffect(() => {
    adapter.onFilterValueChange?.(viewState.filterValue());
  });

  createEffect(() => {
    adapter.onSortValueChange?.(viewState.sortValue());
  });

  const selection = adapter.selectable
    ? createDataGridSelection(sortedRows)
    : undefined;
  const visibleCount = createMemo(() => sortedRows().length);
  const totalCount = createMemo(() => source().totalCount);
  const pickerMeta = createMemo(() => {
    const visible = visibleCount();
    const total = totalCount();

    if (typeof total === "number" && total !== visible) {
      return `${visible} of ${total}`;
    }

    return String(visible);
  });

  const sharedModel = {
    counts: {
      pickerMeta,
      total: totalCount,
      visible: visibleCount,
    },
    columns: {
      openMenu: viewState.openMenu,
      setOpenMenu: viewState.setOpenMenu,
      visibleColumnKeys: viewState.visibleColumnKeys,
      hasHiddenColumns,
      toggleColumn,
    },
    filtering: {
      filterValue: createMemo(() =>
        setup.filter
          ? resolveRecordIndexOptionValue(
              setup.filter.options,
              viewState.filterValue(),
            )
          : undefined,
      ),
      setFilterValue: (value: string | undefined) =>
        viewState.setFilterValue(() => value),
      isActive: filterIsActive,
    },
    loading: {
      status: createMemo(() => source().status),
    },
    sorting: {
      sortValue: createMemo(() =>
        setup.sort
          ? resolveRecordIndexOptionValue(
              setup.sort.options,
              viewState.sortValue(),
            )
          : undefined,
      ),
      setSortValue: (value: string | undefined) =>
        viewState.setSortValue(() => value),
      isActive: sortIsActive,
    },
  } satisfies RecordIndexModel;

  return {
    adapter,
    counts: sharedModel.counts,
    columns: {
      ...sharedModel.columns,
      visibleColumns,
    },
    filtering: {
      ...sharedModel.filtering,
      filteredRows,
    },
    sorting: {
      ...sharedModel.sorting,
      sortedRows,
    },
    loading: sharedModel.loading,
    source: {
      grid: createMemo(() => ({
        status: source().status,
        rows: sortedRows(),
        totalCount: source().totalCount,
        error: source().error,
      })),
      recordIndex: source,
    },
    selection,
  };
}
