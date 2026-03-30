import {
  buildDataGridTemplateColumns,
  getStickyDataGridColumnIndex,
  SELECTION_COLUMN_WIDTH,
} from "~/features/data-grid/hooks/use-column-layout";
import type { DataGridColumn } from "~/features/data-grid/model/types";

import type { RecordIndexFilterDefinition } from "./filter";
import type { RecordIndexSortDefinition } from "./sort";
import type { RecordIndexDraftRowRenderContext } from "./types";

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
