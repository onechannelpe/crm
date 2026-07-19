import { createMemo } from "solid-js";

import { DataTable } from "~/components/ui/layout/data-table";
import type { TableColumn } from "~/components/ui/layout/table-column";
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

export function EventLogResultsTable(props: ResultsProps) {
  const columns = createMemo<TableColumn<EventLogRecord>[]>(() =>
    props.columns.map((column, index) => ({
      key: column.id,
      label: column.label,
      icon: column.icon,
      minWidth: column.minWidth,
      ...(index === props.columns.length - 1
        ? { grow: true }
        : { width: column.defaultWidth }),
      renderCell: column.renderCell,
    })),
  );

  return (
    <div class={styles.container}>
      <DataTable
        ariaLabel="Resultados del registro de eventos"
        columns={columns()}
        emptyState="No hay eventos para los filtros actuales."
        loadMore={{
          hasMore: props.hasNextPage,
          loading: props.loading,
          onLoadMore: props.onLoadMore,
        }}
        rows={props.records}
        status={
          props.loading && props.records.length === 0 ? "pending" : "ready"
        }
      />
    </div>
  );
}
