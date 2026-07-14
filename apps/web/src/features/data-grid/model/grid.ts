import type { JSX } from "solid-js";

import type { DataGridReorderConfig } from "../dnd/types";
import type { DataGridSelectionController } from "./selection";
import type { DataGridSource } from "./source";
import type {
  DataGridActionRowConfig,
  DataGridColumn,
  DataGridLoadMore,
  DataGridRowOpenIndicator,
} from "./types";

export type DataGridPagination = {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
};

export type DataGridProps<T extends { id: string }> = {
  actionRow?: DataGridActionRowConfig;
  ariaLabel: string;
  columns: ReadonlyArray<DataGridColumn<T>>;
  /** A plain sentence is styled by the grid. Pass an element only when the state
   * needs more than text (see RecordIndexEmpty). */
  emptyState: JSX.Element;
  errorState?: JSX.Element;
  loadMore?: DataGridLoadMore;
  onAddColumn?: () => void;
  onRowOpen?: (row: T) => void;
  pagination?: DataGridPagination;
  reorder?: DataGridReorderConfig<T>;
  rowOpenIndicator?: DataGridRowOpenIndicator;
  selection?: DataGridSelectionController;
  source: DataGridSource<T>;
};
