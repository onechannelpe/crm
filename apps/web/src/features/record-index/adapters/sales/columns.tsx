import { listLeadSales } from "~/actions/pipeline/sales";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Package from "~/components/icons/package";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { formatDate } from "~/lib/utils";

import styles from "./styles.module.css";

export type SalesRow = Awaited<ReturnType<typeof listLeadSales>>[number];

export const SALES_RECORD_INDEX_COLUMNS = [
  {
    key: "id",
    label: "Venta",
    icon: CircleQuestionMark,
    width: 132,
    sticky: true,
    renderCell: (sale) => (
      <span class={styles.identifierText}>Venta #{sale.id}</span>
    ),
  },
  {
    key: "proveedor_actual",
    label: "Proveedor",
    icon: Building2,
    minWidth: 220,
    grow: true,
    renderCell: (sale) => (
      <span class={styles.cellText}>{sale.proveedor_actual}</span>
    ),
  },
  {
    key: "gpv",
    label: "GPV",
    icon: Package,
    width: 120,
    renderCell: (sale) => <span class={styles.cellText}>{sale.gpv}</span>,
  },
  {
    key: "created_at",
    label: "Creado",
    icon: CalendarDays,
    width: 140,
    renderCell: (sale) => (
      <span class={styles.mutedCellText}>{formatDate(sale.created_at)}</span>
    ),
  },
] satisfies ReadonlyArray<DataGridColumn<SalesRow>>;
