import type { RecordIndexAdapter } from "../model/record-index-types";

export function useRecordIndexAdapter<T extends { id: number }>(
  adapter: RecordIndexAdapter<T>,
) {
  return adapter;
}
