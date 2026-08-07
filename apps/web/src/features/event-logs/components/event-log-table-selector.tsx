import { For } from "solid-js";

import { Select } from "~/components/ui/input/select";
import {
  isEventLogTable,
  type EventLogTable,
} from "~/contracts/event-logs/event-log";

import { EVENT_LOG_SOURCES } from "../model/event-log-sources";

type EventLogTableSelectorProps = {
  value: EventLogTable;
  onChange: (table: EventLogTable) => void;
};

export function EventLogTableSelector(props: EventLogTableSelectorProps) {
  return (
    <Select
      label="Tabla"
      value={props.value}
      onChange={(event) => {
        const next = event.currentTarget.value;
        if (isEventLogTable(next)) {
          props.onChange(next);
        }
      }}
    >
      <For each={EVENT_LOG_SOURCES}>
        {(source) => <option value={source.table}>{source.label}</option>}
      </For>
    </Select>
  );
}
