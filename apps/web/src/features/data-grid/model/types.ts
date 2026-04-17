import type { Component, JSX } from "solid-js";

import type { DataGridReorderConfig } from "../dnd/types";

type DataGridIconProps = {
  size?: number | string;
};

export type DataGridIcon = Component<DataGridIconProps>;
export type DataGridRowId = string | number;

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
};

export type DataGridActionRowConfig = {
  icon: DataGridIcon;
  label: string;
  onClick: () => void;
};

export type DataGridFeatures<T> = {
  reorder?: DataGridReorderConfig<T>;
};
