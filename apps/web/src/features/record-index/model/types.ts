import type { Accessor, Setter } from "solid-js";

import type { DataGridSelectionModel } from "~/features/data-grid/hooks/use-selection";
import type { DataGridRowOpen } from "~/features/data-grid/model/row-open";
import type { DataGridSource } from "~/features/data-grid/model/source";
import type {
  DataGridColumn,
  DataGridFeatures,
  DataGridIcon,
} from "~/features/data-grid/model/types";

import type { RecordIndexFilterDefinition } from "./filter";
import type { RecordIndexSortDefinition } from "./sort";

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

export type RecordIndexViewDefinition = {
  readonly id: string;
  readonly label: string;
};

export type RecordIndexViews = {
  readonly available: ReadonlyArray<RecordIndexViewDefinition>;
  readonly active: Accessor<RecordIndexViewDefinition>;
  readonly onSelect: (id: string) => void;
};

export type RecordIndexSource<T> = DataGridSource<T> & {
  totalCount?: number;
};

export type RecordIndexEmptyState = {
  icon?: DataGridIcon;
  title: string;
  description?: string;
};

export type RecordIndexOption<TValue extends string = string> = {
  label: string;
  value: TValue;
};

export type RecordIndexMenu = "filter" | "sort" | "options" | "views" | null;

export type RecordIndexAdapter<
  T extends { id: string },
  TFilterValue extends string = string,
  TSortValue extends string = string,
> = {
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
  views?: RecordIndexViews;
  actions?: ReadonlyArray<RecordIndexToolbarAction>;
  filter?: RecordIndexFilterDefinition<T, TFilterValue>;
  sort?: RecordIndexSortDefinition<T, TSortValue>;
};

export type RecordIndexSetup = {
  id: string;
  title: Accessor<string>;
  ariaLabel: string;
  class?: string;
  selectable: boolean;
  columns: ReadonlyArray<{
    key: string;
    label: string;
  }>;
  views?: RecordIndexViews;
  actions?: ReadonlyArray<RecordIndexToolbarAction>;
  filter?: {
    label: string;
    menuId: string;
    defaultValue: string;
    options: ReadonlyArray<RecordIndexOption>;
  };
  sort?: {
    label: string;
    menuId: string;
    defaultValue: string;
    options: ReadonlyArray<RecordIndexOption>;
  };
};

export type RecordIndexColumnsState<T> = {
  openMenu: Accessor<RecordIndexMenu>;
  setOpenMenu: Setter<RecordIndexMenu>;
  visibleColumnKeys: Accessor<Set<string>>;
  visibleColumns: Accessor<DataGridColumn<T>[]>;
  hasHiddenColumns: Accessor<boolean>;
  toggleColumn: (key: string) => void;
};

export type RecordIndexFilteringState<T> = {
  filterValue: Accessor<string | undefined>;
  setFilterValue: (value: string | undefined) => void;
  filteredRows: Accessor<T[]>;
  isActive: Accessor<boolean>;
};

export type RecordIndexSortingState<T> = {
  sortValue: Accessor<string | undefined>;
  setSortValue: (value: string | undefined) => void;
  sortedRows: Accessor<T[]>;
  isActive: Accessor<boolean>;
};

export type RecordIndexViewState = {
  openMenu: Accessor<RecordIndexMenu>;
  setOpenMenu: Setter<RecordIndexMenu>;
  visibleColumnKeys: Accessor<Set<string>>;
  setVisibleColumnKeys: Setter<Set<string>>;
  filterValue: Accessor<string | undefined>;
  setFilterValue: Setter<string | undefined>;
  sortValue: Accessor<string | undefined>;
  setSortValue: Setter<string | undefined>;
};

export type RecordIndexModel = {
  counts: {
    pickerMeta: Accessor<string>;
    total: Accessor<number | undefined>;
    visible: Accessor<number>;
  };
  columns: {
    openMenu: Accessor<RecordIndexMenu>;
    setOpenMenu: Setter<RecordIndexMenu>;
    visibleColumnKeys: Accessor<Set<string>>;
    hasHiddenColumns: Accessor<boolean>;
    toggleColumn: (key: string) => void;
  };
  filtering: {
    filterValue: Accessor<string | undefined>;
    setFilterValue: (value: string | undefined) => void;
    isActive: Accessor<boolean>;
  };
  loading: {
    status: Accessor<RecordIndexSource<unknown>["status"]>;
  };
  sorting: {
    sortValue: Accessor<string | undefined>;
    setSortValue: (value: string | undefined) => void;
    isActive: Accessor<boolean>;
  };
};

export type RecordIndexScreenColumnsState<T> = RecordIndexColumnsState<T> & {
  openMenu: Accessor<RecordIndexMenu>;
  setOpenMenu: Setter<RecordIndexMenu>;
};

export type RecordIndexScreenModel<
  T extends { id: string },
  TFilterValue extends string = string,
  TSortValue extends string = string,
> = {
  adapter: RecordIndexAdapter<T, TFilterValue, TSortValue>;
  counts: {
    pickerMeta: Accessor<string>;
    total: Accessor<number | undefined>;
    visible: Accessor<number>;
  };
  columns: RecordIndexScreenColumnsState<T>;
  filtering: RecordIndexFilteringState<T>;
  loading: {
    status: Accessor<RecordIndexSource<T>["status"]>;
  };
  source: {
    grid: Accessor<DataGridSource<T>>;
    recordIndex: Accessor<RecordIndexSource<T>>;
  };
  sorting: RecordIndexSortingState<T>;
  selection?: DataGridSelectionModel;
};
