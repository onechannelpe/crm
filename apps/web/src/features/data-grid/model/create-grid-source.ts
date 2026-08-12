import { createAsync } from "@solidjs/router";

import type { DataGridSource } from "./source";

type Loaded<TData> = { ok: true; data: TData } | { ok: false };

export type GridSource<TData, TRow> = {
  source: () => DataGridSource<TRow>;
  data: () => TData | undefined;
};

export function createGridSource<TData, TRow>(
  fetcher: () => Promise<TData>,
  project: (data: TData) => {
    rows: readonly TRow[];
    totalCount?: number;
  },
  options?: {
    overlay?: (rows: readonly TRow[]) => readonly TRow[];
  },
): GridSource<TData, TRow> {
  const state = createAsync<Loaded<TData>>(async () => {
    try {
      return { ok: true, data: await fetcher() };
    } catch (error) {
      // Redirects and not-found responses are framework control flow.
      if (error instanceof Response) {
        throw error;
      }

      return { ok: false };
    }
  });

  const overlay = options?.overlay ?? ((rows: readonly TRow[]) => rows);

  const data = () => {
    const value = state.latest;

    return value?.ok ? value.data : undefined;
  };

  const source = (): DataGridSource<TRow> => {
    const value = state.latest;

    if (value === undefined) {
      // Show optimistic rows before the first server response.
      const rows = overlay([]);

      return rows.length > 0
        ? { status: "ready", rows, totalCount: rows.length }
        : { status: "pending", rows: [] };
    }

    if (!value.ok) {
      return { status: "error", rows: [] };
    }

    const projected = project(value.data);
    const rows = overlay(projected.rows);

    return {
      status: "ready",
      rows,
      totalCount: projected.totalCount ?? rows.length,
    };
  };

  return { source, data };
}
