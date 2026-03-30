import type { JSX } from "solid-js";

import type { DataGridRowOpen } from "~/features/data-grid/model/row-open";
import type {
  DataGridActionRowConfig,
  DataGridColumn,
} from "~/features/data-grid/model/types";

import type { RecordIndexFilterOption } from "./filter";
import type { RecordIndexSortOption } from "./sort";

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
