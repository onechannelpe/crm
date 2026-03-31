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
  getCount?: () => number;
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

export type RecordIndexColumnsState<T> = {
  openMenu: Accessor<RecordIndexMenu>;
  setOpenMenu: Setter<RecordIndexMenu>;
  visibleColumnKeys: Accessor<Set<string>>;
  visibleColumns: Accessor<DataGridColumn<T>[]>;
  hasHiddenColumns: Accessor<boolean>;
  toggleColumn: (key: string) => void;
};

export type RecordIndexFilteringState<T, TValue extends string> = {
  filterValue: Accessor<TValue | undefined>;
  setFilterValue: (value: TValue | undefined) => void;
  filteredRows: Accessor<T[]>;
  isActive: Accessor<boolean>;
};

export type RecordIndexSortingState<T, TValue extends string> = {
  sortValue: Accessor<TValue | undefined>;
  setSortValue: (value: TValue | undefined) => void;
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

export type RecordIndexScreenModel<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
> = {
  adapter: RecordIndexAdapter<T, TFilterValue, TSortValue>;
  count: Accessor<number>;
  columns: RecordIndexColumnsState<T>;
  filtering: RecordIndexFilteringState<T, TFilterValue>;
  sorting: RecordIndexSortingState<T, TSortValue>;
  selection?: DataGridSelectionModel;
  draftRow: Accessor<JSX.Element | undefined>;
};
