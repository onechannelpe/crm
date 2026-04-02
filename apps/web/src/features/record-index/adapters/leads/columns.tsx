import { queryLeadList } from "~/actions/pipeline/queries/leads";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import House from "~/components/icons/house";
import Package from "~/components/icons/package";
import { Badge } from "~/components/ui/display/badge";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { formatDate } from "~/lib/utils";

import styles from "./styles.module.css";

export type LeadRow = Awaited<ReturnType<typeof queryLeadList>>["rows"][number];

export const LEADS_RECORD_INDEX_COLUMNS = [
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
    icon: Package,
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
    key: "createdAt",
    label: "Creado",
    icon: CalendarDays,
    width: 140,
    renderCell: (lead) => (
      <span class={styles.mutedCellText}>{formatDate(lead.createdAt)}</span>
    ),
  },
] satisfies ReadonlyArray<DataGridColumn<LeadRow>>;
