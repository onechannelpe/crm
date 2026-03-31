import type { Accessor, JSX, Setter } from "solid-js";

import type { DataGridSelectionModel } from "~/features/data-grid/hooks/use-selection";
import type { DataGridRowOpen } from "~/features/data-grid/model/row-open";
import type {
  DataGridActionRowConfig,
  DataGridColumn,
  DataGridIcon,
} from "~/features/data-grid/model/types";

import type { RecordIndexFilterDefinition } from "./filter";
import type { RecordIndexSortDefinition } from "./sort";

export type RecordIndexDraftRowRenderContext<T> = {
  columns: DataGridColumn<T>[];
  gridTemplateColumns: string;
  stickyColumnIndex: number;
  stickyLeft: number;
};

export type RecordIndexOption<TValue extends string = string> = {
  label: string;
  value: TValue;
};

export type RecordIndexMenu = "filter" | "sort" | "options" | null;

export type RecordIndexAdapter<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
> = {
  id: string;
  title: string;
  ariaLabel: string;
  class?: string;
  pickerIcon?: DataGridIcon;
  columns: ReadonlyArray<DataGridColumn<T>>;
  getRows: () => T[];
  isLoading: () => boolean;
  getTotalCount?: () => number | undefined;
  selectable?: boolean;
  rowOpen: DataGridRowOpen<T>;
  emptyState: JSX.Element;
  filter?: RecordIndexFilterDefinition<T, TFilterValue>;
  sort?: RecordIndexSortDefinition<T, TSortValue>;
  renderDraftRow?: (
    context: RecordIndexDraftRowRenderContext<T>,
  ) => JSX.Element | undefined;
  actionRow?: DataGridActionRowConfig;
};

export type RecordIndexSetup = {
  id: string;
  title: string;
  ariaLabel: string;
  class?: string;
  pickerIcon?: DataGridIcon;
  selectable: boolean;
  columns: ReadonlyArray<{
    key: string;
    label: string;
  }>;
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
    isInitial: Accessor<boolean>;
  };
  sorting: {
    sortValue: Accessor<string | undefined>;
    setSortValue: (value: string | undefined) => void;
    isActive: Accessor<boolean>;
  };
};

export type RecordIndexScreenModel<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
> = {
  adapter: RecordIndexAdapter<T, TFilterValue, TSortValue>;
  counts: {
    pickerMeta: Accessor<string>;
    total: Accessor<number | undefined>;
    visible: Accessor<number>;
  };
  columns: RecordIndexColumnsState<T> &
    Pick<RecordIndexModel["columns"], "openMenu" | "setOpenMenu">;
  filtering: RecordIndexFilteringState<T>;
  loading: {
    isInitial: Accessor<boolean>;
  };
  sorting: RecordIndexSortingState<T>;
  selection?: DataGridSelectionModel;
  draftRow: Accessor<JSX.Element | undefined>;
};
