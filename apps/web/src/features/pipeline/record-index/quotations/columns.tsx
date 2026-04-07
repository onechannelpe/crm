import Building2 from "~/components/icons/building-2";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Package from "~/components/icons/package";
import { Badge } from "~/components/ui/display/badge";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import type { LeadListRowView } from "~/server/pipeline/application/contracts";

import styles from "./styles.module.css";

export const QUOTATIONS_RECORD_INDEX_COLUMNS = [
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
    key: "stage",
    label: "Etapa",
    icon: Package,
    width: 180,
    renderCell: (lead) => <Badge variant="warning">{lead.stage}</Badge>,
  },
] satisfies ReadonlyArray<DataGridColumn<LeadListRowView>>;
