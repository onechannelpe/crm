export type DataGridRowOpenMode = "panel" | "route" | "inline" | "none";

export type DataGridRowOpen<T> = {
  mode: DataGridRowOpenMode;
  open: (row: T) => void;
};

export function createPanelRowOpen<T>(
  open: (row: T) => void,
): DataGridRowOpen<T> {
  return {
    mode: "panel",
    open,
  };
}

export function createRouteRowOpen<T>(
  open: (row: T) => void,
): DataGridRowOpen<T> {
  return {
    mode: "route",
    open,
  };
}

export function createNoopRowOpen<T>(): DataGridRowOpen<T> {
  return {
    mode: "none",
    open: () => {},
  };
}
