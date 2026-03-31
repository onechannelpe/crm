export type DataGridReorderEvent<T> = {
  fromIndex: number;
  toIndex: number;
  row: T;
  rows: T[];
};

export type DataGridReorderConfig<T> = {
  onReorder: (event: DataGridReorderEvent<T>) => void;
};
