import { createAsync } from "@solidjs/router";

import List from "~/components/icons/list";
import Package from "~/components/icons/package";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type { RecordIndexAdapter } from "~/features/record-index/model/types";
import { inventoryItemsQuery } from "~/lib/queries/inventory";

import type { InventoryRow } from "./columns";
import { INVENTORY_RECORD_INDEX_COLUMNS } from "./columns";
import { useOpenInventoryRecord } from "./open-row";

import styles from "./styles.module.css";

export function InventoryRecordIndex() {
  const items = createAsync(() => inventoryItemsQuery());
  const rows = () => items() ?? [];
  const isLoading = () => items() === undefined;
  const { rowOpen } = useOpenInventoryRecord();

  const adapter = {
    id: "inventory",
    title: "Inventario",
    ariaLabel: "Inventario",
    pickerIcon: List,
    columns: INVENTORY_RECORD_INDEX_COLUMNS,
    getRows: rows,
    isLoading,
    selectable: true,
    rowOpen,
    emptyState: {
      icon: Package,
      title: "Add your first inventory item",
      description: "Add your first inventory item manually.",
    },
    class: styles.page,
  } satisfies RecordIndexAdapter<InventoryRow>;

  return <RecordIndexScreen adapter={adapter} />;
}
