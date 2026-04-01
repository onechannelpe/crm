import { queryLeadList } from "~/actions/lead-pipeline/lead-detail";
import Building2 from "~/components/icons/building-2";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Package from "~/components/icons/package";
import { Badge } from "~/components/ui/display/badge";
import type { DataGridColumn } from "~/features/data-grid/model/types";

import styles from "./styles.module.css";

export type QuotationRow = Awaited<
  ReturnType<typeof queryLeadList>
>["rows"][number];

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
    key: "razon_social",
    label: "Razón social",
    icon: Building2,
    minWidth: 220,
    grow: true,
    renderCell: (lead) => (
      <span class={styles.cellText}>{lead.razon_social ?? "—"}</span>
    ),
  },
  {
    key: "stage",
    label: "Etapa",
    icon: Package,
    width: 180,
    renderCell: (lead) => <Badge variant="warning">{lead.stage}</Badge>,
  },
] satisfies ReadonlyArray<DataGridColumn<QuotationRow>>;
