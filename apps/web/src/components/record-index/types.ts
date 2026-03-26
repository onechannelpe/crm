import type { JSX } from "solid-js";

export type IndexColumn<T> = {
  key: string;
  label: string;
  icon: JSX.Element;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  grow?: boolean;
  sticky?: boolean;
  render: (row: T) => JSX.Element;
};

export type IndexPicker = {
  icon: JSX.Element;
  label: string;
  count?: number;
  onClick?: () => void;
};
