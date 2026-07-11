import { createMemo, createSignal, type Accessor } from "solid-js";

import Pause from "~/components/icons/pause";
import Play from "~/components/icons/play";
import { LightIconButton } from "~/components/ui/input/light-icon-button";
import { Card } from "~/components/ui/surfaces/card";
import type {
  EventLogQueryInput,
  EventLogQueryResult,
  EventLogTable,
} from "~/contracts/event-logs/event-log";

import { useEventLogsLiveStream } from "../hooks/use-event-logs-live-stream";
import { useQueryEventLogs } from "../hooks/use-query-event-logs";
import { hasEventLogFilters } from "../model/event-log-location";
import { getEventLogSource } from "../model/event-log-sources";
import { mergeEventLogRecords } from "../model/merge-event-log-records";
import { EventLogFilters } from "./event-log-filters";
import { EventLogResultsTable } from "./event-log-results-table";
import { EventLogTableSelector } from "./event-log-table-selector";

import styles from "./settings-logs.module.css";

export function SettingsLogs(props: {
  input: Accessor<EventLogQueryInput>;
  firstPage: Accessor<EventLogQueryResult | undefined>;
  onTableChange: (table: EventLogTable) => void;
  onFiltersChange: (filters: EventLogQueryInput["filters"]) => void;
}) {
  const [isPaused, setIsPaused] = createSignal(false);
  const source = createMemo(() => getEventLogSource(props.input().table));
  const query = useQueryEventLogs(props.input, props.firstPage);
  const streamEnabled = () => !isPaused() && !hasEventLogFilters(props.input());
  const liveRecords = useEventLogsLiveStream({
    table: () => props.input().table,
    enabled: streamEnabled,
  });
  const displayedRecords = createMemo(() =>
    mergeEventLogRecords(liveRecords(), query.records()),
  );
  const liveOnlyCount = createMemo(
    () => displayedRecords().length - query.records().length,
  );

  return (
    <div class={styles.root}>
      <Card rounded fullWidth backgroundColor="var(--surface)">
        <div class={styles.cardContent}>
          <div class={styles.selectorRow}>
            <div class={styles.selectorGrow}>
              <EventLogTableSelector
                value={props.input().table}
                onChange={props.onTableChange}
              />
            </div>
            <LightIconButton
              Icon={isPaused() ? Play : Pause}
              accent="secondary"
              size="medium"
              aria-label={isPaused() ? "Reanudar" : "Pausar"}
              onClick={() => setIsPaused((paused) => !paused)}
            />
          </div>
          <EventLogFilters
            source={source()}
            value={props.input().filters ?? {}}
            onChange={props.onFiltersChange}
          />
        </div>
      </Card>
      <div class={styles.results}>
        <span class={styles.recordCount}>
          {displayedRecords().length} de{" "}
          {query.totalCount() + Math.max(0, liveOnlyCount())}
        </span>
        <EventLogResultsTable
          columns={source().columns}
          records={displayedRecords()}
          loading={query.loading()}
          hasNextPage={query.hasNextPage()}
          onLoadMore={query.loadMore}
        />
      </div>
    </div>
  );
}
