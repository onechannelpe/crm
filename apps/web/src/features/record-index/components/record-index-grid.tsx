import type { JSX } from "solid-js";

import {
  DataGrid,
  type DataGridActionRowConfig,
  type DataGridColumn,
  type DataGridSelectionModel,
} from "~/features/data-grid";

export function RecordIndexGrid<T extends { id: number }>(props: {
  actionRow?: DataGridActionRowConfig;
  ariaLabel: string;
  columns: DataGridColumn<T>[];
  draftRow?: JSX.Element;
  emptyState: JSX.Element;
  onRowClick: (row: T) => void;
  rows: T[];
  selection: DataGridSelectionModel;
}) {
  return <DataGrid {...props} />;
}
