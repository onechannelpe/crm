import { createMemo } from "solid-js";

import type { EventLogRecord } from "~/contracts/event-logs/event-log";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";

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
  const columns = createMemo<DataGridColumn<EventLogRecord>[]>(() =>
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
      <DataGrid
        ariaLabel="Resultados del registro de eventos"
        columns={columns()}
        emptyState="No hay eventos para los filtros actuales."
        loadMore={{
          hasMore: props.hasNextPage,
          loading: props.loading,
          onLoadMore: props.onLoadMore,
        }}
        source={{
          status:
            props.loading && props.records.length === 0 ? "pending" : "ready",
          rows: props.records,
        }}
      />
    </div>
  );
}
