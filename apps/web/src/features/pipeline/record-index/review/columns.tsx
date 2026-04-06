import type { LeadListRow } from "~/actions/pipeline/contracts/lead-list";
import Building2 from "~/components/icons/building-2";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Info from "~/components/icons/info";
import Package from "~/components/icons/package";
import { Badge } from "~/components/ui/display/badge";
import type { DataGridColumn } from "~/features/data-grid/model/types";

import styles from "./styles.module.css";

export const REVIEW_RECORD_INDEX_COLUMNS = [
  {
    key: "ruc",
    label: "RUC",
    icon: CircleQuestionMark,
    width: 180,
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
      <span class={styles.cellText}>{lead.razonSocial ?? "-"}</span>
    ),
  },
  {
    key: "status",
    label: "Estado",
    icon: Info,
    width: 180,
    renderCell: (lead) => <Badge variant="outline">{lead.status ?? "-"}</Badge>,
  },
  {
    key: "prioridad",
    label: "Prioridad",
    icon: Package,
    width: 160,
    renderCell: (lead) => (
      <Badge variant="secondary">{lead.prioridad ?? "-"}</Badge>
    ),
  },
] satisfies ReadonlyArray<DataGridColumn<LeadListRow>>;
