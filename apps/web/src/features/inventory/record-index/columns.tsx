import type { InventoryItem } from "~/actions/inventory/queries";
import Building2 from "~/components/icons/building-2";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Package from "~/components/icons/package";
import { Badge } from "~/components/ui/display/badge";
import type { DataGridColumn } from "~/features/data-grid/model/types";

import styles from "./styles.module.css";

export type InventoryRow = InventoryItem;

const STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  reserved: "Reservado",
  sold: "Vendido",
};

function resolveStatusVariant(status: string) {
  switch (status) {
    case "available":
      return "success" as const;
    case "reserved":
      return "warning" as const;
    case "sold":
      return "default" as const;
    default:
      return "default" as const;
  }
}

export const INVENTORY_RECORD_INDEX_COLUMNS = [
  {
    key: "productName",
    label: "Producto",
    icon: Package,
    minWidth: 220,
    grow: true,
    sticky: true,
    renderCell: (item) => (
      <span class={styles.product}>{item.productName}</span>
    ),
  },
  {
    key: "serial_number",
    label: "Número de serie",
    icon: CircleQuestionMark,
    width: 180,
    renderCell: (item) => (
      <span class={styles.serial}>{item.serial_number}</span>
    ),
  },
  {
    key: "category",
    label: "Categoría",
    icon: Building2,
    width: 160,
    renderCell: (item) => <Badge variant="outline">{item.category}</Badge>,
  },
  {
    key: "status",
    label: "Estado",
    icon: Package,
    width: 160,
    renderCell: (item) => (
      <Badge variant={resolveStatusVariant(item.status)}>
        {STATUS_LABELS[item.status] ?? item.status}
      </Badge>
    ),
  },
] satisfies ReadonlyArray<DataGridColumn<InventoryRow>>;
