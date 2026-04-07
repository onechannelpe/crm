import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Package from "~/components/icons/package";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { formatDate } from "~/lib/utils";
import type { SaleView } from "~/server/pipeline/application/contracts";

import styles from "./styles.module.css";

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
    key: "proveedorActual",
    label: "Proveedor",
    icon: Building2,
    minWidth: 220,
    grow: true,
    renderCell: (sale) => (
      <span class={styles.cellText}>{sale.proveedorActual}</span>
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
    key: "createdAt",
    label: "Creado",
    icon: CalendarDays,
    width: 140,
    renderCell: (sale) => (
      <span class={styles.mutedCellText}>{formatDate(sale.createdAt)}</span>
    ),
  },
] satisfies ReadonlyArray<DataGridColumn<SaleView>>;
