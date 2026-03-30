import { createMemo } from "solid-js";

import {
  buildDataGridTemplateColumns,
  getStickyDataGridColumnIndex,
  SELECTION_COLUMN_WIDTH,
} from "~/features/data-grid/hooks/use-column-layout";
import { createDataGridSelection } from "~/features/data-grid/hooks/use-selection";

import { useRecordIndexViewState } from "../context/instance-context";
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
    adapter.columns.filter((column) =>
      viewState.visibleColumnKeys().has(column.key),
    ),
  );

  function toggleColumn(key: string) {
    viewState.setVisibleColumnKeys((current) => {
      if (current.has(key)) {
        if (current.size === 1) {
          return current;
        }

        const next = new Set(current);
        next.delete(key);
        return next;
      }

      const next = new Set(current);
      next.add(key);
      return next;
    });
  }

  const hasHiddenColumns = createMemo(
    () => viewState.visibleColumnKeys().size !== adapter.columns.length,
  );

  const filteredRows = createMemo(() => {
    const filter = adapter.filter;
    if (!filter) {
      return adapter.getRows();
    }

    const selectedOption = filter.options.find(
      (option) => option.value === viewState.filterValue(),
    );
    if (!selectedOption) {
      return adapter.getRows();
    }

    return filter.apply(adapter.getRows(), selectedOption.value);
  });

  const filterIsActive = createMemo(() => {
    const filter = adapter.filter;
    const selectedOption = filter?.options.find(
      (option) => option.value === viewState.filterValue(),
    );

    if (!filter || !selectedOption) {
      return false;
    }

    return filter.isActive
      ? filter.isActive(selectedOption.value)
      : selectedOption.value !== filter.defaultValue;
  });

  const sortedRows = createMemo(() => {
    const sort = adapter.sort;
    if (!sort) {
      return filteredRows();
    }

    const selectedOption = sort.options.find(
      (option) => option.value === viewState.sortValue(),
    );
    if (!selectedOption) {
      return filteredRows();
    }

    return sort.apply(filteredRows(), selectedOption.value);
  });

  const sortIsActive = createMemo(() => {
    const sort = adapter.sort;
    const selectedOption = sort?.options.find(
      (option) => option.value === viewState.sortValue(),
    );

    if (!sort || !selectedOption) {
      return false;
    }

    return sort.isActive
      ? sort.isActive(selectedOption.value)
      : selectedOption.value !== sort.defaultValue;
  });

  const selection = createDataGridSelection(sortedRows);
  const gridTemplateColumns = createMemo(() =>
    buildDataGridTemplateColumns(visibleColumns()),
  );
  const stickyColumnIndex = createMemo(() =>
    getStickyDataGridColumnIndex(visibleColumns()),
  );
  const draftRow = createMemo(() =>
    adapter.renderDraftRow?.({
      columns: visibleColumns(),
      gridTemplateColumns: gridTemplateColumns(),
      stickyColumnIndex: stickyColumnIndex(),
      stickyLeft: SELECTION_COLUMN_WIDTH,
    }),
  );
  const count = createMemo(() =>
    adapter.getCount ? adapter.getCount() : adapter.getRows().length,
  );

  return {
    adapter,
    count,
    columns: {
      openMenu: viewState.openMenu,
      setOpenMenu: viewState.setOpenMenu,
      visibleColumnKeys: viewState.visibleColumnKeys,
      visibleColumns,
      hasHiddenColumns,
      toggleColumn,
    },
    filtering: {
      filterValue: createMemo(() => {
        const selectedOption = adapter.filter?.options.find(
          (option) => option.value === viewState.filterValue(),
        );
        return selectedOption?.value;
      }),
      setFilterValue: viewState.setFilterValue,
      filteredRows,
      isActive: filterIsActive,
    },
    sorting: {
      sortValue: createMemo(() => {
        const selectedOption = adapter.sort?.options.find(
          (option) => option.value === viewState.sortValue(),
        );
        return selectedOption?.value;
      }),
      setSortValue: viewState.setSortValue,
      sortedRows,
      isActive: sortIsActive,
    },
    selection,
    draftRow,
  };
}
