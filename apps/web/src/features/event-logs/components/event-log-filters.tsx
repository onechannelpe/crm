import { Show } from "solid-js";

import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";

import type { EventLogSource } from "../model/event-log-sources";
import { EventLogDatePickerInput } from "./event-log-date-picker-input";

import styles from "./event-log-filters.module.css";

export type EventLogFiltersUi = {
  eventType?: string;
  actorUserId?: string;
  status?: string;
  onlyHighRisk?: boolean;
  startDate?: Date;
  endDate?: Date;
};

type EventLogFiltersProps = {
  source: EventLogSource;
  value: EventLogFiltersUi;
  onChange: (next: EventLogFiltersUi) => void;
};

export function EventLogFilters(props: EventLogFiltersProps) {
  const has = (field: string) => props.source.filters.includes(field as never);
  const patch = (partial: Partial<EventLogFiltersUi>) =>
    props.onChange({ ...props.value, ...partial });

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
          onChange={(event) =>
            patch({ status: event.currentTarget.value || undefined })
          }
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
              value={props.value.startDate}
              onChange={(date) => patch({ startDate: date })}
            />
            <EventLogDatePickerInput
              placeholder="Fecha final"
              value={props.value.endDate}
              onChange={(date) => patch({ endDate: date })}
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
              patch({ onlyHighRisk: event.currentTarget.checked })
            }
          />
        </div>
      </Show>
    </div>
  );
}
