import { createMemo, createSignal } from "solid-js";

import Pause from "~/components/icons/pause";
import Play from "~/components/icons/play";
import { LightIconButton } from "~/components/ui/input/light-icon-button";
import { Card } from "~/components/ui/surfaces/card";
import type {
  EventLogFilters,
  EventLogRecord,
  EventLogTable,
} from "~/contracts/event-logs/event-log";

import { useEventLogsLiveStream } from "../hooks/use-event-logs-live-stream";
import { useQueryEventLogs } from "../hooks/use-query-event-logs";
import { getEventLogSource } from "../model/event-log-sources";
import {
  EventLogFilters as EventLogFiltersView,
  type EventLogFiltersUi,
} from "./event-log-filters";
import { EventLogResultsTable } from "./event-log-results-table";
import { EventLogTableSelector } from "./event-log-table-selector";

import styles from "./settings-logs.module.css";

const RECORDS_PER_PAGE = 100;

function hasActiveFilters(filters: EventLogFiltersUi): boolean {
  return (
    Boolean(filters.eventType) ||
    Boolean(filters.actorUserId) ||
    Boolean(filters.status) ||
    filters.onlyHighRisk === true ||
    filters.startDate !== undefined ||
    filters.endDate !== undefined
  );
}

function toContractFilters(ui: EventLogFiltersUi): EventLogFilters {
  const dateRange =
    ui.startDate || ui.endDate
      ? { start: ui.startDate?.getTime(), end: ui.endDate?.getTime() }
      : undefined;
  return {
    eventType: ui.eventType,
    actorUserId: ui.actorUserId,
    status: ui.status,
    onlyHighRisk: ui.onlyHighRisk,
    dateRange,
  };
}

export function SettingsLogs() {
  const [selectedTable, setSelectedTable] =
    createSignal<EventLogTable>("DOMAIN_EVENT");
  const [filters, setFilters] = createSignal<EventLogFiltersUi>({});
  const [isPaused, setIsPaused] = createSignal(false);

  const source = createMemo(() => getEventLogSource(selectedTable()));

  const baseInput = createMemo(() => ({
    table: selectedTable(),
    first: RECORDS_PER_PAGE,
    filters: toContractFilters(filters()),
  }));

  const { records, totalCount, hasNextPage, loading, loadMore } =
    useQueryEventLogs(baseInput);

  const streamEnabled = () => !isPaused() && !hasActiveFilters(filters());
  const liveRecords = useEventLogsLiveStream({
    table: selectedTable,
    enabled: streamEnabled,
  });

  const displayedRecords = createMemo<EventLogRecord[]>(() => [
    ...liveRecords(),
    ...records(),
  ]);

  const handleTableChange = (table: EventLogTable) => {
    setSelectedTable(table);
    setFilters({});
  };

  return (
    <div class={styles.root}>
      <Card rounded fullWidth backgroundColor="var(--surface)">
        <div class={styles.cardContent}>
          <div class={styles.selectorRow}>
            <div class={styles.selectorGrow}>
              <EventLogTableSelector
                value={selectedTable()}
                onChange={handleTableChange}
              />
            </div>
            <LightIconButton
              Icon={isPaused() ? Play : Pause}
              accent="secondary"
              size="medium"
              aria-label={isPaused() ? "Reanudar" : "Pausar"}
              onClick={() => setIsPaused((previous) => !previous)}
            />
          </div>
          <EventLogFiltersView
            source={source()}
            value={filters()}
            onChange={setFilters}
          />
        </div>
      </Card>

      <div class={styles.results}>
        <span class={styles.recordCount}>
          {displayedRecords().length} de {totalCount() + liveRecords().length}
        </span>
        <EventLogResultsTable
          columns={source().columns}
          records={displayedRecords()}
          loading={loading()}
          hasNextPage={hasNextPage()}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
