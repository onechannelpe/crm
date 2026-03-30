import type { RecordIndexAdapter } from "../model/types";

export function useRecordIndexAdapter<T extends { id: number }>(
  adapter: RecordIndexAdapter<T>,
) {
  return adapter;
}
