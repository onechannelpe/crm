import { createAsync, useIsRouting } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  on,
  useTransition,
  type Accessor,
} from "solid-js";

import type { Page } from "~/contracts/merchant-stats/views";

export const GPV_GRID_PAGE_SIZE = 60;

interface DashboardGridConfig<Raw, Row> {
  pageSize: number;
  resetOn: Accessor<unknown>;
  load: (page: Page) => Promise<ReadonlyArray<Raw>>;
  toRow: (raw: Raw) => Row;
}

interface DashboardGrid<Row> {
  rows: Accessor<Row[]>;
  loading: Accessor<boolean>;
  hasMore: Accessor<boolean>;
  onLoadMore: () => void;
}

export function useDashboardGrid<Raw, Row>(
  config: DashboardGridConfig<Raw, Row>,
): DashboardGrid<Row> {
  const [pageCount, setPageCount] = createSignal(1);
  const [loadingMore, startLoadMore] = useTransition();
  const isRouting = useIsRouting();

  // Ignore mount. A changed filter or issue starts from the first page.
  createEffect(on(config.resetOn, () => setPageCount(1), { defer: true }));

  const pages = createAsync(async () => {
    const requests = Array.from({ length: pageCount() }, (_, index) =>
      config.load({ limit: config.pageSize, offset: index * config.pageSize }),
    );
    return Promise.all(requests);
  });

  const rows = createMemo<Row[]>(() =>
    (pages() ?? []).flat().map(config.toRow),
  );

  const hasMore = createMemo(() => {
    const loaded = pages();
    if (!loaded || loaded.length === 0) return false;
    return loaded[loaded.length - 1].length === config.pageSize;
  });

  return {
    rows,
    loading: () => loadingMore() || isRouting(),
    hasMore,
    onLoadMore: () => {
      void startLoadMore(() => setPageCount((count) => count + 1));
    },
  };
}
