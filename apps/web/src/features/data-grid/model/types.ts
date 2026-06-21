import type { Component, JSX } from "solid-js";

import type { DataGridReorderConfig } from "../dnd/types";

type DataGridIconProps = {
  size?: number | string;
};

export type DataGridIcon = Component<DataGridIconProps>;

// Editable columns hand the grid a self-contained editor. The editor owns its
// mutation and calls `close` when done; the grid only positions it and tracks
// which cell is open.
export type DataGridColumnEdit<T> = {
  ariaLabel: string;
  renderEditor: (args: { row: T; close: () => void }) => JSX.Element;
};

export type DataGridColumn<T> = {
  key: string;
  label: string;
  icon: DataGridIcon;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  grow?: boolean;
  sticky?: boolean;
  renderCell: (row: T) => JSX.Element;
  edit?: DataGridColumnEdit<T>;
};

export type DataGridActionRowConfig = {
  icon: DataGridIcon;
  label: string;
  onClick: () => void;
};

export type DataGridFeatures<T> = {
  reorder?: DataGridReorderConfig<T>;
};
