import type { Component, JSX } from "solid-js";

type IndexIconProps = {
  size?: number | string;
};

export type IndexIcon = Component<IndexIconProps>;

export type IndexColumn<T> = {
  key: string;
  label: string;
  icon: IndexIcon;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  grow?: boolean;
  sticky?: boolean;
  render: (row: T) => JSX.Element;
};

export type IndexPicker = {
  icon: IndexIcon;
  label: string;
  count?: number;
  onClick?: () => void;
};

export type IndexActionRowConfig = {
  icon: IndexIcon;
  label: string;
  onClick: () => void;
};
