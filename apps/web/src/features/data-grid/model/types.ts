import type { JSX } from "solid-js";

import type {
  TableColumn,
  TableIcon,
} from "~/components/ui/layout/table-column";

export type DataGridIcon = TableIcon;

// Editor calls close() on commit; the grid only positions the editor and
// tracks the open cell.
export type DataGridColumnEdit<T> = {
  ariaLabel: string;
  renderEditor: (args: { row: T; close: () => void }) => JSX.Element;
};

export type DataGridColumn<T> = TableColumn<T> & {
  edit?: DataGridColumnEdit<T>;
};

export type DataGridActionRowConfig = {
  icon: DataGridIcon;
  label: string;
  onClick: () => void;
};

export type DataGridRowOpenIndicator = "panel" | "route";

export type DataGridLoadMore = {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void | Promise<void>;
};
