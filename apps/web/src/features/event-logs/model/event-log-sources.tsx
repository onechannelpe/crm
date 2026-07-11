import type { Component, JSX } from "solid-js";

import Activity from "~/components/icons/activity";
import CalendarClock from "~/components/icons/calendar-clock";
import CalendarDays from "~/components/icons/calendar-days";
import CircleCheckBig from "~/components/icons/circle-check-big";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Timer from "~/components/icons/loader-circle";
import Lock from "~/components/icons/lock";
import UserRound from "~/components/icons/user-round";
import { Badge } from "~/components/ui/display/badge";
import type {
  EventLogRecord,
  EventLogTable,
} from "~/contracts/event-logs/event-log";
import { formatDateTime } from "~/lib/utils";

import { EventLogJsonCell } from "../components/event-log-json-cell";

type BadgeVariant = "success" | "destructive" | "outline";

export type EventLogColumn = {
  id: string;
  label: string;
  icon: Component<{ size?: number }>;
  minWidth: number;
  defaultWidth: number;
  renderCell: (record: EventLogRecord) => JSX.Element;
};

export type EventLogFilterField =
  | "eventType"
  | "actorUserId"
  | "status"
  | "onlyHighRisk"
  | "dateRange";

export type EventLogSource = {
  table: EventLogTable;
  label: string;
  eventTypeLabel: string;
  columns: EventLogColumn[];
  filters: EventLogFilterField[];
};

function formatActor(userId: string | null): string {
  return userId === null ? "Sistema" : userId;
}

function formatEntity(record: EventLogRecord): string {
  if (!record.entityType) return "-";
  return `${record.entityType}#${record.entityId ?? ""}`;
}

function statusVariant(status: string): BadgeVariant {
  if (status === "ok") return "success";
  if (status === "error") return "destructive";
  return "outline";
}

function outcomeVariant(outcome: string): BadgeVariant {
  const normalized = outcome.toLowerCase();
  if (normalized.includes("success") || normalized.includes("ok")) {
    return "success";
  }
  if (normalized.includes("fail") || normalized.includes("error")) {
    return "destructive";
  }
  return "outline";
}

const TIMESTAMP_COLUMN: EventLogColumn = {
  id: "timestamp",
  label: "Hora",
  icon: CalendarDays,
  minWidth: 120,
  defaultWidth: 180,
  renderCell: (record) => formatDateTime(record.timestamp),
};

const ACTOR_COLUMN: EventLogColumn = {
  id: "userId",
  label: "Actor",
  icon: UserRound,
  minWidth: 100,
  defaultWidth: 150,
  renderCell: (record) => formatActor(record.userId),
};

const DETAILS_COLUMN: EventLogColumn = {
  id: "properties",
  label: "Detalles",
  icon: CircleQuestionMark,
  minWidth: 200,
  defaultWidth: 360,
  renderCell: (record) => <EventLogJsonCell value={record.properties} />,
};

const DOMAIN_SOURCE: EventLogSource = {
  table: "DOMAIN_EVENT",
  label: "Eventos de dominio",
  eventTypeLabel: "Acción",
  filters: ["eventType", "actorUserId", "onlyHighRisk", "dateRange"],
  columns: [
    TIMESTAMP_COLUMN,
    {
      id: "event",
      label: "Acción",
      icon: Activity,
      minWidth: 160,
      defaultWidth: 220,
      renderCell: (record) => record.event,
    },
    {
      id: "entity",
      label: "Entidad",
      icon: CircleQuestionMark,
      minWidth: 120,
      defaultWidth: 180,
      renderCell: (record) => formatEntity(record),
    },
    ACTOR_COLUMN,
    {
      id: "changes",
      label: "Cambios",
      icon: CircleQuestionMark,
      minWidth: 200,
      defaultWidth: 320,
      renderCell: (record) => record.changesSummary ?? "-",
    },
    DETAILS_COLUMN,
  ],
};

const ACTION_SOURCE: EventLogSource = {
  table: "ACTION_LOG",
  label: "Registros de acción",
  eventTypeLabel: "Acción",
  filters: ["eventType", "actorUserId", "status", "dateRange"],
  columns: [
    TIMESTAMP_COLUMN,
    {
      id: "event",
      label: "Acción",
      icon: Activity,
      minWidth: 180,
      defaultWidth: 260,
      renderCell: (record) => record.event,
    },
    {
      id: "status",
      label: "Estado",
      icon: CircleCheckBig,
      minWidth: 90,
      defaultWidth: 120,
      renderCell: (record) =>
        record.status ? (
          <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
        ) : (
          "-"
        ),
    },
    {
      id: "duration",
      label: "Duración",
      icon: Timer,
      minWidth: 90,
      defaultWidth: 110,
      renderCell: (record) =>
        record.durationMs === null ? "-" : `${record.durationMs} ms`,
    },
    ACTOR_COLUMN,
    DETAILS_COLUMN,
  ],
};

const AUTH_SOURCE: EventLogSource = {
  table: "AUTH_EVENT",
  label: "Autenticación",
  eventTypeLabel: "Evento",
  filters: ["eventType", "dateRange"],
  columns: [
    TIMESTAMP_COLUMN,
    {
      id: "event",
      label: "Evento",
      icon: Activity,
      minWidth: 180,
      defaultWidth: 240,
      renderCell: (record) => record.event,
    },
    {
      id: "screen",
      label: "Pantalla",
      icon: CircleQuestionMark,
      minWidth: 120,
      defaultWidth: 160,
      renderCell: (record) => record.screen ?? "-",
    },
    {
      id: "method",
      label: "Método",
      icon: Lock,
      minWidth: 110,
      defaultWidth: 150,
      renderCell: (record) => record.method ?? "-",
    },
    {
      id: "outcome",
      label: "Resultado",
      icon: CalendarClock,
      minWidth: 110,
      defaultWidth: 150,
      renderCell: (record) =>
        record.outcome ? (
          <Badge variant={outcomeVariant(record.outcome)}>
            {record.outcome}
          </Badge>
        ) : (
          "-"
        ),
    },
    DETAILS_COLUMN,
  ],
};

export const EVENT_LOG_SOURCES: EventLogSource[] = [
  DOMAIN_SOURCE,
  ACTION_SOURCE,
  AUTH_SOURCE,
];

const SOURCE_BY_TABLE: Record<EventLogTable, EventLogSource> = {
  DOMAIN_EVENT: DOMAIN_SOURCE,
  ACTION_LOG: ACTION_SOURCE,
  AUTH_EVENT: AUTH_SOURCE,
};

export function getEventLogSource(table: EventLogTable): EventLogSource {
  return SOURCE_BY_TABLE[table];
}
