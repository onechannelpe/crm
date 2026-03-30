import type { JSX } from "solid-js";

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
  rowOpen: DataGridRowOpen<T>;
  emptyState: JSX.Element;
  filter?: RecordIndexFilterDefinition<T, TFilterValue>;
  sort?: RecordIndexSortDefinition<T, TSortValue>;
  renderDraftRow?: (
    context: RecordIndexDraftRowRenderContext<T>,
  ) => JSX.Element | undefined;
  actionRow?: DataGridActionRowConfig;
};
