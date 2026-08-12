import { Show } from "solid-js";

import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import {
  isEventLogStatus,
  type EventLogFilters as Filters,
} from "~/contracts/event-logs/event-log";

import type {
  EventLogFilterField,
  EventLogSource,
} from "../model/event-log-sources";
import { EventLogDatePickerInput } from "./event-log-date-picker-input";

import styles from "./event-log-filters.module.css";

export function EventLogFilters(props: {
  source: EventLogSource;
  value: Filters;
  onChange: (next: Filters) => void;
}) {
  const has = (field: EventLogFilterField) =>
    props.source.filters.includes(field);
  const patch = (partial: Partial<Filters>) =>
    props.onChange({ ...props.value, ...partial });
  const range = () => props.value.dateRange;

  return (
    <div class={styles.grid}>
      <Show when={has("eventType")}>
        <Input
          label={props.source.eventTypeLabel}
          value={props.value.eventType ?? ""}
          placeholder="Filtrar por evento"
          onInput={(event) =>
            patch({ eventType: event.currentTarget.value || undefined })
          }
        />
      </Show>
      <Show when={has("actorUserId")}>
        <Input
          label="Actor"
          value={props.value.actorUserId ?? ""}
          placeholder="ID de usuario"
          onInput={(event) =>
            patch({ actorUserId: event.currentTarget.value || undefined })
          }
        />
      </Show>
      <Show when={has("status")}>
        <Select
          label="Estado"
          value={props.value.status ?? ""}
          onChange={(event) => {
            const value = event.currentTarget.value;
            patch({ status: isEventLogStatus(value) ? value : undefined });
          }}
        >
          <option value="">Todos</option>
          <option value="ok">ok</option>
          <option value="error">error</option>
        </Select>
      </Show>
      <Show when={has("dateRange")}>
        <div class={styles.fullWidth}>
          <div class={styles.periodLabel}>Periodo</div>
          <div class={styles.periodRow}>
            <EventLogDatePickerInput
              placeholder="Fecha inicial"
              value={range()?.start}
              onChange={(start) => patch({ dateRange: { ...range(), start } })}
            />
            <EventLogDatePickerInput
              placeholder="Fecha final"
              value={range()?.end}
              onChange={(end) => patch({ dateRange: { ...range(), end } })}
            />
          </div>
        </div>
      </Show>
      <Show when={has("onlyHighRisk")}>
        <div class={styles.checkboxCell}>
          <Checkbox
            label="Solo riesgo alto"
            checked={props.value.onlyHighRisk ?? false}
            onInput={(event) =>
              patch({ onlyHighRisk: event.currentTarget.checked || undefined })
            }
          />
        </div>
      </Show>
    </div>
  );
}
