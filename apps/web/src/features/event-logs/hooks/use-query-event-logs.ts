import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  type Accessor,
} from "solid-js";

import { getEventLogs } from "~/actions/audit/event-logs";
import type {
  EventLogQueryInput,
  EventLogQueryResult,
  EventLogRecord,
} from "~/contracts/event-logs/event-log";
import { eventLogsQuery } from "~/lib/queries/event-logs";

type BaseInput = Omit<EventLogQueryInput, "after">;

export function useQueryEventLogs(baseInput: Accessor<BaseInput>) {
  const [extraPages, setExtraPages] = createSignal<EventLogQueryResult[]>([]);
  const [loadingMore, setLoadingMore] = createSignal(false);

  const [firstPage] = createResource(baseInput, (input) =>
    eventLogsQuery({ ...input, after: undefined }),
  );

  createEffect(on(baseInput, () => setExtraPages([]), { defer: true }));

  const pages = createMemo<EventLogQueryResult[]>(() => {
    const first = firstPage.latest;
    return first ? [first, ...extraPages()] : extraPages();
  });

  const records = createMemo<EventLogRecord[]>(() =>
    pages().flatMap((page) => page.records),
  );

  const lastPage = (): EventLogQueryResult | undefined => pages().at(-1);
  const hasNextPage = (): boolean => lastPage()?.pageInfo.hasNextPage ?? false;
  const totalCount = (): number => firstPage.latest?.totalCount ?? 0;
  const loading = (): boolean => firstPage.loading || loadingMore();

  const error = (): Error | null => {
    const err = firstPage.error;
    if (err instanceof Error) return err;
    if (err === undefined || err === null) return null;
    return new Error(String(err));
  };

  async function loadMore(): Promise<void> {
    const cursor = lastPage()?.pageInfo.endCursor;
    if (!hasNextPage() || loading() || !cursor) return;
    setLoadingMore(true);
    try {
      const next = await getEventLogs({ ...baseInput(), after: cursor });
      setExtraPages((previous) => [...previous, next]);
    } finally {
      setLoadingMore(false);
    }
  }

  return { records, totalCount, hasNextPage, loading, error, loadMore };
}
