import {
  createEffect,
  createMemo,
  createSignal,
  on,
  type Accessor,
} from "solid-js";

import { getEventLogs } from "~/actions/audit/event-logs";
import type {
  EventLogQueryInput,
  EventLogQueryResult,
} from "~/contracts/event-logs/event-log";

type BaseInput = Omit<EventLogQueryInput, "after">;

export function useQueryEventLogs(
  baseInput: Accessor<BaseInput>,
  firstPage: Accessor<EventLogQueryResult | undefined>,
) {
  const [extraPages, setExtraPages] = createSignal<EventLogQueryResult[]>([]);
  const [loadingMore, setLoadingMore] = createSignal(false);

  createEffect(on(baseInput, () => setExtraPages([]), { defer: true }));
  const pages = createMemo(() =>
    firstPage() ? [firstPage()!, ...extraPages()] : extraPages(),
  );
  const records = createMemo(() => pages().flatMap((page) => page.records));
  const lastPage = () => pages().at(-1);
  const hasNextPage = () => lastPage()?.pageInfo.hasNextPage ?? false;

  async function loadMore(): Promise<void> {
    const cursor = lastPage()?.pageInfo.endCursor;
    if (!hasNextPage() || loadingMore() || !cursor) return;
    setLoadingMore(true);
    try {
      const page = await getEventLogs({ ...baseInput(), after: cursor });
      setExtraPages((previous) => [...previous, page]);
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    records,
    totalCount: () => firstPage()?.totalCount ?? 0,
    hasNextPage,
    loading: () => firstPage() === undefined || loadingMore(),
    loadMore,
  };
}
