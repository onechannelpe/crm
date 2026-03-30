import type { JSX } from "solid-js";

import type {
  DataGridActionRowConfig,
  DataGridColumn,
  DataGridRowOpen,
} from "~/features/data-grid";

import type { RecordIndexFilterOption } from "./record-index-filter";
import type { RecordIndexSortOption } from "./record-index-sort";

export type RecordIndexAdapter<T extends { id: number }> = {
  id: string;
  title: string;
  columns: DataGridColumn<T>[];
  getRows: () => T[];
  rowOpen: DataGridRowOpen<T>;
  emptyState: JSX.Element;
  filters?: RecordIndexFilterOption[];
  sorts?: RecordIndexSortOption[];
  draftRow?: JSX.Element;
  actionRow?: DataGridActionRowConfig;
};
