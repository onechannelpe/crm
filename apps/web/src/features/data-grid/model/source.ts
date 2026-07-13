export type DataGridSource<T> = {
  status: "pending" | "ready" | "error";
  rows: ReadonlyArray<T>;
  totalCount?: number;
};
