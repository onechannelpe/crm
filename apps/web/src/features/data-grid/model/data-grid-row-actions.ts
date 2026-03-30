import type { DataGridIcon } from "./data-grid-types";

export type DataGridRowAction<T> = {
  key: string;
  label: string;
  icon?: DataGridIcon;
  run: (row: T) => void | Promise<void>;
};
