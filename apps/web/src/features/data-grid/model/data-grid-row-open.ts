export type DataGridRowOpenMode = "panel" | "route" | "inline" | "none";

export type DataGridRowOpen<T> = {
  mode: DataGridRowOpenMode;
  open: (row: T) => void;
};
