import type { Accessor } from "solid-js";

import type { DataGridRowOpen } from "~/features/data-grid/model/row-open";
import type { DataGridSource } from "~/features/data-grid/model/source";
import type {
  DataGridColumn,
  DataGridFeatures,
  DataGridIcon,
} from "~/features/data-grid/model/types";

import type {
  RecordIndexFilterCatalog,
  RecordIndexSortCatalog,
  RecordIndexViews,
} from "./catalog";

// A live read+write handle to a value the adapter owns and projects to the
// view-bar. The adapter owns the signal, the view-bar reads `value` and calls
// `set`, and the adapter's query reads `value` directly. Replaces the old
// onXChange callbacks, which forced a second copy of the value in the adapter.
export type RecordIndexControl<TValue> = {
  value: Accessor<TValue>;
  set: (value: TValue) => void;
};

export type RecordIndexSearchControl = RecordIndexControl<string> & {
  placeholder: string;
};

export type RecordIndexSource<T> = DataGridSource<T> & {
  totalCount?: number;
};

export type RecordIndexCreateAction = {
  label: string;
  emptyLabel?: string;
  inlineLabel?: string;
  icon?: DataGridIcon;
  onClick: () => void;
};

export type RecordIndexToolbarAction = {
  key: string;
  label: string;
  onClick: () => void | Promise<void>;
};

export type RecordIndexEmptyState = {
  icon?: DataGridIcon;
  title: string;
  description?: string;
};

export type RecordIndexPagination = {
  readonly currentPage: Accessor<number>;
  readonly pageSize: number;
  readonly totalCount: Accessor<number>;
  readonly onNextPage: () => void;
  readonly onPreviousPage: () => void;
};

export type RecordIndexAdapter<T extends { id: string }> = {
  id: string;
  title: string | Accessor<string>;
  ariaLabel: string;
  class?: string;
  pickerIcon?: DataGridIcon;
  columns: ReadonlyArray<DataGridColumn<T>>;
  source: () => RecordIndexSource<T>;
  reorder?: DataGridFeatures<T>["reorder"];
  selectable?: boolean;
  rowOpen: DataGridRowOpen<T>;
  emptyState: RecordIndexEmptyState;
  createAction?: RecordIndexCreateAction;
  pagination?: RecordIndexPagination;
  actions?: ReadonlyArray<RecordIndexToolbarAction>;
  // Each selector bundles its static catalog with its live value so the two
  // always travel together (present or absent as one unit). The value is a
  // plain string: the catalog keeps the narrow union at its definition site,
  // but selection flows through the non-generic view-bar as a string.
  filter?: {
    catalog: RecordIndexFilterCatalog;
    value: RecordIndexControl<string | undefined>;
  };
  sort?: {
    catalog: RecordIndexSortCatalog;
    value: RecordIndexControl<string | undefined>;
  };
  views?: {
    catalog: RecordIndexViews;
    value: RecordIndexControl<string>;
  };
  search?: RecordIndexSearchControl;
};
