export type DataGridReorderEvent<T> = {
  fromIndex: number;
  toIndex: number;
  row: T;
  rows: T[];
};

export type DataGridReorderConfig<T> = {
  onReorder: (event: DataGridReorderEvent<T>) => void;
};

export type DataGridPoint = {
  x: number;
  y: number;
};

export type DataGridSelectionBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};
