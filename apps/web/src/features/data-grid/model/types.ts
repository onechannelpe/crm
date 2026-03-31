import type { Component, JSX } from "solid-js";

type DataGridIconProps = {
  size?: number | string;
};

export type DataGridIcon = Component<DataGridIconProps>;

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

export type DataGridPicker = {
  icon: DataGridIcon;
  label: string;
  meta?: string;
  onClick?: () => void;
};

export type DataGridActionRowConfig = {
  icon: DataGridIcon;
  label: string;
  onClick: () => void;
};
