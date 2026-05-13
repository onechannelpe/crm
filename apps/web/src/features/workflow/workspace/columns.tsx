import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Info from "~/components/icons/info";
import Package from "~/components/icons/package";
import Target from "~/components/icons/target";
import TimelineEvent from "~/components/icons/timeline-event";
import User from "~/components/icons/user";
import { Badge } from "~/components/ui/display/badge";
import {
  RecordChip,
  RecordLinkChip,
} from "~/components/ui/record-chip/record-chip";
import type { LeadListRowView } from "~/contracts/workflow/views";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import {
  leadNextStepLabel,
  leadPriorityLabel,
  leadStageLabel,
  leadStatusLabel,
} from "~/features/workflow/presentation/lead-display";
import type { Role } from "~/lib/auth/access/rbac";
import { formatDate } from "~/lib/utils";

import styles from "./styles.module.css";

const COMMON_COLUMNS: ReadonlyArray<DataGridColumn<LeadListRowView>> = [
  {
    key: "ruc",
    label: "RUC",
    icon: CircleQuestionMark,
    width: 196,
    sticky: true,
    renderCell: (lead) => (
      <RecordLinkChip
        href={`/records/${lead.id}`}
        name={lead.ruc}
        shape="square"
        showAvatar={false}
      />
    ),
  },
  {
    key: "razonSocial",
    label: "Razón social",
    icon: Building2,
    minWidth: 240,
    maxWidth: 420,
    renderCell: (lead) => (
      <RecordLinkChip
        href={`/records/${lead.id}`}
        name={lead.razonSocial ?? lead.ruc}
        shape="square"
      />
    ),
  },
  {
    key: "stage",
    label: "Etapa",
    icon: Target,
    width: 172,
    renderCell: (lead) => (
      <Badge
        variant={
          lead.stage === "CLOSING"
            ? "success"
            : lead.stage === "SCOPING"
              ? "warning"
              : "secondary"
        }
      >
        {leadStageLabel(lead.stage)}
      </Badge>
    ),
  },
  {
    key: "status",
    label: "Estado",
    icon: Info,
    width: 168,
    renderCell: (lead) => (
      <Badge variant="outline">{leadStatusLabel(lead.status)}</Badge>
    ),
  },
  {
    key: "prioridad",
    label: "Prioridad",
    icon: Package,
    width: 152,
    renderCell: (lead) => (
      <Badge variant="secondary">{leadPriorityLabel(lead.prioridad)}</Badge>
    ),
  },
  {
    key: "nextStep",
    label: "Siguiente paso",
    icon: TimelineEvent,
    minWidth: 220,
    renderCell: (lead) => (
      <span class={styles.mutedCellText}>
        {leadNextStepLabel(lead.nextStep)}
      </span>
    ),
  },
  {
    key: "updatedAt",
    label: "Actualizado",
    icon: CalendarDays,
    width: 140,
    renderCell: (lead) => (
      <span class={styles.mutedCellText}>{formatDate(lead.updatedAt)}</span>
    ),
  },
];

const BACK_OFFICE_COLUMNS: ReadonlyArray<DataGridColumn<LeadListRowView>> = [
  ...COMMON_COLUMNS,
  {
    key: "createdBy",
    label: "Registrado por",
    icon: User,
    width: 150,
    renderCell: (lead) => (
      <RecordChip name={lead.createdByName} shape="round" />
    ),
  },
];

export function workspaceColumnsForRole(
  role: Role,
): ReadonlyArray<DataGridColumn<LeadListRowView>> {
  if (role === "back_office") {
    return BACK_OFFICE_COLUMNS;
  }
  return COMMON_COLUMNS;
}
