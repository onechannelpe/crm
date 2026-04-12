import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import House from "~/components/icons/house";
import Info from "~/components/icons/info";
import Package from "~/components/icons/package";
import Target from "~/components/icons/target";
import TimelineEvent from "~/components/icons/timeline-event";
import User from "~/components/icons/user";
import { Badge } from "~/components/ui/display/badge";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import type { Role } from "~/lib/auth/access/rbac";
import { formatDate } from "~/lib/utils";
import type { LeadListRowView } from "~/server/pipeline/application/queries/views/lead-list";

import styles from "./styles.module.css";

const COMMON_COLUMNS: ReadonlyArray<DataGridColumn<LeadListRowView>> = [
  {
    key: "ruc",
    label: "RUC",
    icon: CircleQuestionMark,
    width: 196,
    sticky: true,
    renderCell: (lead) => <span class={styles.identifierText}>{lead.ruc}</span>,
  },
  {
    key: "razonSocial",
    label: "Razón social",
    icon: Building2,
    minWidth: 220,
    grow: true,
    renderCell: (lead) => (
      <div class={styles.fieldWithIcon}>
        <span class={styles.fieldIcon}>
          <Building2 size={14} />
        </span>
        <span class={styles.cellText}>{lead.razonSocial || "Sin datos"}</span>
      </div>
    ),
  },
  {
    key: "address",
    label: "Dirección",
    icon: House,
    minWidth: 220,
    maxWidth: 300,
    renderCell: (lead) => (
      <div class={styles.fieldWithIcon}>
        <span class={styles.fieldIcon}>
          <House size={14} />
        </span>
        <span class={styles.mutedCellText}>{lead.address || "Sin datos"}</span>
      </div>
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
          lead.stage === "READY_FOR_SALE"
            ? "success"
            : lead.stage === "NEEDS_EXECUTIVE_INPUT"
              ? "warning"
              : "secondary"
        }
      >
        {lead.stage}
      </Badge>
    ),
  },
  {
    key: "status",
    label: "Estado",
    icon: Info,
    width: 168,
    renderCell: (lead) => <Badge variant="outline">{lead.status ?? "-"}</Badge>,
  },
  {
    key: "prioridad",
    label: "Prioridad",
    icon: Package,
    width: 152,
    renderCell: (lead) => (
      <Badge variant="secondary">{lead.prioridad ?? "-"}</Badge>
    ),
  },
  {
    key: "nextStep",
    label: "Siguiente paso",
    icon: TimelineEvent,
    minWidth: 220,
    renderCell: (lead) => (
      <span class={styles.mutedCellText}>{lead.nextStep}</span>
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
    key: "executiveId",
    label: "Registrado por",
    icon: User,
    width: 150,
    renderCell: (lead) => (
      <span class={styles.mutedCellText}>Ejecutivo #{lead.executiveId}</span>
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
