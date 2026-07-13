import type { Accessor } from "solid-js";

import type { TileColor } from "~/components/ui/display/tinted-icon-tile/tinted-icon-tile";
import type { DataGridReorderConfig } from "~/features/data-grid/dnd/types";
import type { DataGridSource } from "~/features/data-grid/model/source";
import type {
  DataGridColumn,
  DataGridIcon,
  DataGridRowOpenIndicator,
} from "~/features/data-grid/model/types";

import type {
  RecordIndexFilterCatalog,
  RecordIndexSortCatalog,
  RecordIndexViews,
} from "./catalog";

export type RecordIndexControl<TValue> = {
  value: Accessor<TValue>;
  set: (value: TValue) => void;
};

export type RecordIndexSearchControl = RecordIndexControl<string> & {
  placeholder: string;
};

export type RecordIndexCreateAction = {
  label: string;
  emptyLabel?: string;
  inlineLabel?: string;
  icon?: DataGridIcon;
  onClick: () => void;
};

export type RecordIndexAction = {
  label: string;
  onClick: () => void | Promise<void>;
};

export type RecordIndexEmptyState = {
  icon?: DataGridIcon;
  title: string;
  description?: string;
};

export type RecordIndexPagination = {
  currentPage: Accessor<number>;
  pageSize: number;
  totalCount: Accessor<number>;
  onNextPage: () => void;
  onPreviousPage: () => void;
};

export type RecordIndexPresentationDefinition = {
  id: string;
  title: Accessor<string>;
  class?: string;
  pickerIcon?: DataGridIcon;
  object: {
    label: string;
    icon: DataGridIcon;
    color: TileColor;
  };
  columns: ReadonlyArray<Pick<DataGridColumn<never>, "key" | "label">>;
  emptyState: RecordIndexEmptyState;
  createAction?: RecordIndexCreateAction;
  actions?: ReadonlyArray<RecordIndexAction>;
  filter?: { catalog: RecordIndexFilterCatalog };
  sort?: { catalog: RecordIndexSortCatalog };
  views?: { catalog: RecordIndexViews };
};

export type RecordIndexDefinition<T extends { id: string }> = Omit<
  RecordIndexPresentationDefinition,
  "columns" | "filter" | "sort" | "views"
> & {
  ariaLabel: string;
  columns: ReadonlyArray<DataGridColumn<T>>;
  source: Accessor<DataGridSource<T>>;
  reorder?: DataGridReorderConfig<T>;
  onRowOpen?: (row: T) => void;
  rowOpenIndicator?: DataGridRowOpenIndicator;
  pagination?: RecordIndexPagination;
  filter?: {
    catalog: RecordIndexFilterCatalog;
    control: RecordIndexControl<string | undefined>;
  };
  sort?: {
    catalog: RecordIndexSortCatalog;
    control: RecordIndexControl<string | undefined>;
  };
  views?: {
    catalog: RecordIndexViews;
    control: RecordIndexControl<string>;
  };
  search?: RecordIndexSearchControl;
};
