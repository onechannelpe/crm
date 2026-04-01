export type DataGridSource<T> = {
  status: "pending" | "ready" | "error";
  rows: T[];
  error?: Error;
};
