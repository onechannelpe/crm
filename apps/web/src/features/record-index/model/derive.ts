import {
  buildDataGridTemplateColumns,
  getStickyDataGridColumnIndex,
  SELECTION_COLUMN_WIDTH,
} from "~/features/data-grid/hooks/use-column-layout";
import type { DataGridColumn } from "~/features/data-grid/model/types";

import type { RecordIndexFilterDefinition } from "./filter";
import type { RecordIndexSortDefinition } from "./sort";
import type {
  RecordIndexModel,
  RecordIndexDraftRowRenderContext,
  RecordIndexMenu,
  RecordIndexScreenModel,
  RecordIndexSetup,
} from "./types";

export function getVisibleRecordIndexColumns<T>(
  columns: ReadonlyArray<DataGridColumn<T>>,
  visibleColumnKeys: Set<string>,
) {
  return columns.filter((column) => visibleColumnKeys.has(column.key));
}

export function toggleRecordIndexVisibleColumnKey(
  visibleColumnKeys: Set<string>,
  key: string,
) {
  if (visibleColumnKeys.has(key)) {
    if (visibleColumnKeys.size === 1) {
      return visibleColumnKeys;
    }

    const next = new Set(visibleColumnKeys);
    next.delete(key);
    return next;
  }

  const next = new Set(visibleColumnKeys);
  next.add(key);
  return next;
}

export function hasHiddenRecordIndexColumns<T>(
  columns: ReadonlyArray<DataGridColumn<T>>,
  visibleColumnKeys: Set<string>,
) {
  return visibleColumnKeys.size !== columns.length;
}

export function applyRecordIndexFilter<T, TValue extends string>(
  rows: T[],
  filter: RecordIndexFilterDefinition<T, TValue> | undefined,
  value: string | undefined,
) {
  if (!filter) {
    return rows;
  }

  const selectedOption = filter.options.find(
    (option) => option.value === value,
  );
  if (!selectedOption) {
    return rows;
  }

  return filter.apply(rows, selectedOption.value);
}

export function resolveRecordIndexOptionValue<TValue extends string>(
  options: ReadonlyArray<{ value: TValue }>,
  value: string | undefined,
) {
  return options.find((option) => option.value === value)?.value;
}

export function isRecordIndexFilterActive<T, TValue extends string>(
  filter: RecordIndexFilterDefinition<T, TValue> | undefined,
  value: string | undefined,
) {
  if (!filter) {
    return false;
  }

  const selectedOption = resolveRecordIndexOptionValue(filter.options, value);
  if (!selectedOption) {
    return false;
  }

  return filter.isActive
    ? filter.isActive(selectedOption)
    : selectedOption !== filter.defaultValue;
}

export function applyRecordIndexSort<T, TValue extends string>(
  rows: T[],
  sort: RecordIndexSortDefinition<T, TValue> | undefined,
  value: string | undefined,
) {
  if (!sort) {
    return rows;
  }

  const selectedOption = sort.options.find((option) => option.value === value);
  if (!selectedOption) {
    return rows;
  }

  return sort.apply(rows, selectedOption.value);
}

export function isRecordIndexSortActive<T, TValue extends string>(
  sort: RecordIndexSortDefinition<T, TValue> | undefined,
  value: string | undefined,
) {
  if (!sort) {
    return false;
  }

  const selectedOption = resolveRecordIndexOptionValue(sort.options, value);
  if (!selectedOption) {
    return false;
  }

  return sort.isActive
    ? sort.isActive(selectedOption)
    : selectedOption !== sort.defaultValue;
}

export function createRecordIndexDraftRowRenderContext<T>(
  columns: DataGridColumn<T>[],
): RecordIndexDraftRowRenderContext<T> {
  return {
    columns,
    gridTemplateColumns: buildDataGridTemplateColumns(columns),
    stickyColumnIndex: getStickyDataGridColumnIndex(columns),
    stickyLeft: SELECTION_COLUMN_WIDTH,
  };
}

export function reconcileVisibleRecordIndexColumnKeys(
  setup: Pick<RecordIndexSetup, "columns">,
  visibleColumnKeys: Set<string>,
) {
  const allowedKeys = new Set(setup.columns.map((column) => column.key));
  const nextVisibleColumnKeys = new Set(
    [...visibleColumnKeys].filter((key) => allowedKeys.has(key)),
  );

  if (nextVisibleColumnKeys.size === 0) {
    return new Set(setup.columns.map((column) => column.key));
  }

  return nextVisibleColumnKeys;
}

export function reconcileRecordIndexOptionValue(
  options: ReadonlyArray<{ value: string }> | undefined,
  value: string | undefined,
  defaultValue: string | undefined,
) {
  if (!options || !value) {
    return defaultValue;
  }

  return options.some((option) => option.value === value)
    ? value
    : defaultValue;
}

export function reconcileRecordIndexOpenMenu(
  openMenu: RecordIndexMenu,
  setup: Pick<RecordIndexSetup, "filter" | "sort">,
) {
  if (openMenu === "filter" && !setup.filter) {
    return null;
  }

  if (openMenu === "sort" && !setup.sort) {
    return null;
  }

  return openMenu;
}

export function createRecordIndexContextModel<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(model: RecordIndexScreenModel<T, TFilterValue, TSortValue>) {
  return {
    counts: model.counts,
    columns: {
      openMenu: model.columns.openMenu,
      setOpenMenu: model.columns.setOpenMenu,
      visibleColumnKeys: model.columns.visibleColumnKeys,
      hasHiddenColumns: model.columns.hasHiddenColumns,
      toggleColumn: model.columns.toggleColumn,
    },
    filtering: {
      filterValue: model.filtering.filterValue,
      setFilterValue: model.filtering.setFilterValue,
      isActive: model.filtering.isActive,
    },
    loading: model.loading,
    sorting: {
      sortValue: model.sorting.sortValue,
      setSortValue: model.sorting.setSortValue,
      isActive: model.sorting.isActive,
    },
  } satisfies RecordIndexModel;
}
