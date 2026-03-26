import type { JSX } from "solid-js";

import { listLeads } from "~/actions/pipeline/leads";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import House from "~/components/icons/house";
import Package from "~/components/icons/package";
import { Badge } from "~/components/ui/display/badge";
import { formatDate } from "~/lib/utils";

import type { IndexColumn } from "~/components/record-index/types";

import styles from "./styles.module.css";

export type LeadRow = Awaited<ReturnType<typeof listLeads>>[number];

export const LEAD_COLUMNS = [
  {
    key: "ruc",
    label: "RUC",
    icon: <CircleQuestionMark size={14} />,
    width: 196,
    sticky: true,
    render: (lead) => <span class={styles.identifierText}>{lead.ruc}</span>,
  },
  {
    key: "razon_social",
    label: "Razón social",
    icon: <Building2 size={14} />,
    minWidth: 220,
    grow: true,
    render: (lead) => (
      <div class={styles.fieldWithIcon}>
        <span class={styles.fieldIcon}>
          <Building2 size={14} />
        </span>
        <span class={styles.cellText}>{lead.razon_social || "Sin datos"}</span>
      </div>
    ),
  },
  {
    key: "address",
    label: "Dirección",
    icon: <House size={14} />,
    minWidth: 220,
    maxWidth: 300,
    render: (lead) => (
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
    icon: <Package size={14} />,
    width: 172,
    render: (lead) => (
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
    key: "created_at",
    label: "Creado",
    icon: <CalendarDays size={14} />,
    width: 140,
    render: (lead) => (
      <span class={styles.mutedCellText}>{formatDate(lead.created_at)}</span>
    ),
  },
] satisfies ReadonlyArray<IndexColumn<LeadRow>>;
