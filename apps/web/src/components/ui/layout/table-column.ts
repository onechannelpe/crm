import type { Component, JSX } from "solid-js";

export type TableColumnAlign = "left" | "center" | "right";

export type TableIcon = Component<{ size?: number | string }>;

export type TableColumn<T> = {
  key: string;
  label: string;
  icon?: TableIcon;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  grow?: boolean;
  sticky?: boolean;
  align?: TableColumnAlign;
  renderCell: (row: T) => JSX.Element;
};
