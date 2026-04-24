export type DataGridSource<T> = {
  status: "pending" | "ready" | "error";
  rows: T[];
  totalCount?: number;
  error?: Error;
};
