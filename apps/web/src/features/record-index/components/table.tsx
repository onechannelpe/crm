import type { JSX } from "solid-js";

import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridSelectionModel } from "~/features/data-grid/hooks/use-selection";
import type { DataGridRowOpen } from "~/features/data-grid/model/row-open";
import {
  type DataGridActionRowConfig,
  type DataGridColumn,
} from "~/features/data-grid/model/types";

export function RecordIndexGrid<T extends { id: number }>(props: {
  actionRow?: DataGridActionRowConfig;
  ariaLabel: string;
  columns: DataGridColumn<T>[];
  draftRow?: JSX.Element;
  emptyState: JSX.Element;
  rowOpen: DataGridRowOpen<T>;
  rows: T[];
  selection: DataGridSelectionModel;
}) {
  return <DataGrid {...props} />;
}
