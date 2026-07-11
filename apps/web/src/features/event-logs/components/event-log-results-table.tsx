import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";

import { Skeleton } from "~/components/ui/feedback/skeleton";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table-grid/table-grid";
import {
  ScrollWrapper,
  useScrollWrapperElement,
} from "~/components/ui/utilities/scroll-wrapper";
import type { EventLogRecord } from "~/contracts/event-logs/event-log";

import type { EventLogColumn } from "../model/event-log-sources";

import styles from "./event-log-results-table.module.css";

type ResultsProps = {
  columns: readonly EventLogColumn[];
  records: EventLogRecord[];
  loading: boolean;
  hasNextPage: boolean;
  onLoadMore: () => Promise<void>;
};

function buildGridTemplateColumns(
  columns: readonly EventLogColumn[],
  widths: Record<string, number>,
): string {
  return columns
    .map((column, index) => {
      const width = widths[column.id] ?? column.defaultWidth;
      const isLast = index === columns.length - 1;
      return isLast ? `minmax(${width}px, 1fr)` : `${width}px`;
    })
    .join(" ");
}

// Inner body so the infinite-scroll observer can use the ScrollWrapper element
// as its root (context is only available to descendants of ScrollWrapper).
function ResultsBody(props: ResultsProps) {
  const scrollElement = useScrollWrapperElement();
  const [widths, setWidths] = createSignal<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = createSignal<string | null>(null);

  // Reset widths to defaults whenever the column set (table) changes.
  createEffect(() => {
    setWidths(
      Object.fromEntries(props.columns.map((c) => [c.id, c.defaultWidth])),
    );
  });

  const gridTemplateColumns = () =>
    buildGridTemplateColumns(props.columns, widths());

  const handleResizeStart = (column: EventLogColumn, event: PointerEvent) => {
    event.preventDefault();
    setResizingColumn(column.id);
    const startX = event.clientX;
    const startWidth = widths()[column.id] ?? column.defaultWidth;

    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(column.minWidth, startWidth + delta);
      setWidths((previous) => ({ ...previous, [column.id]: nextWidth }));
    };
    const onUp = () => {
      setResizingColumn(null);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const [sentinel, setSentinel] = createSignal<HTMLDivElement>();
  createEffect(() => {
    const root = scrollElement();
    const el = sentinel();
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && props.hasNextPage && !props.loading) {
          void props.onLoadMore();
        }
      },
      { root: root ?? null, rootMargin: "400px" },
    );
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  const isInitialLoading = () => props.loading && props.records.length === 0;

  return (
    <Show
      when={!isInitialLoading()}
      fallback={
        <Table>
          <TableRow gridTemplateColumns={gridTemplateColumns()}>
            <For each={props.columns}>
              {(column) => <TableHeader>{column.label}</TableHeader>}
            </For>
          </TableRow>
          <TableRow gridTemplateColumns={gridTemplateColumns()}>
            <For each={props.columns}>
              {(_column, index) => (
                <TableCell>
                  <Show when={index() === 0}>
                    <Skeleton width={120} height={16} />
                  </Show>
                </TableCell>
              )}
            </For>
          </TableRow>
        </Table>
      }
    >
      <Show
        when={props.records.length > 0}
        fallback={
          <p class={styles.empty}>No hay eventos para los filtros actuales.</p>
        }
      >
        <Table>
          <TableRow gridTemplateColumns={gridTemplateColumns()}>
            <For each={props.columns}>
              {(column) => (
                <div
                  class={styles.headerCell}
                  data-resizing={
                    resizingColumn() === column.id ? "" : undefined
                  }
                >
                  <TableHeader>{column.label}</TableHeader>
                  <div
                    class={styles.resizeHandle}
                    data-resizing={
                      resizingColumn() === column.id ? "" : undefined
                    }
                    onPointerDown={(event) => handleResizeStart(column, event)}
                  />
                </div>
              )}
            </For>
          </TableRow>
          <For each={props.records}>
            {(record) => (
              <TableRow gridTemplateColumns={gridTemplateColumns()}>
                <For each={props.columns}>
                  {(column) => (
                    <TableCell ellipsis>{column.renderCell(record)}</TableCell>
                  )}
                </For>
              </TableRow>
            )}
          </For>
        </Table>
        <div ref={setSentinel} class={styles.sentinel} />
        <Show when={props.loading && props.records.length > 0}>
          <div class={styles.loadingMore}>Cargando más...</div>
        </Show>
      </Show>
    </Show>
  );
}

export function EventLogResultsTable(props: ResultsProps) {
  return (
    <div class={styles.container}>
      <ScrollWrapper>
        <ResultsBody {...props} />
      </ScrollWrapper>
    </div>
  );
}
