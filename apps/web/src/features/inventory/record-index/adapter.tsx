import { createAsync } from "@solidjs/router";

import type { InventoryItemView } from "~/actions/inventory/contracts";
import { getInventoryItems } from "~/actions/inventory/queries";
import List from "~/components/icons/list";
import Package from "~/components/icons/package";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type {
  RecordIndexAdapter,
  RecordIndexSource,
} from "~/features/record-index/model/types";

import { INVENTORY_RECORD_INDEX_COLUMNS } from "./columns";
import { useOpenInventoryRecord } from "./open-row";

import styles from "./styles.module.css";

export function InventoryRecordIndex() {
  const items = createAsync(() => getInventoryItems());
  const { rowOpen } = useOpenInventoryRecord();
  const source = (): RecordIndexSource<InventoryItemView> => {
    const data = items();

    if (data === undefined) {
      return { status: "pending", rows: [] };
    }

    return { status: "ready", rows: data };
  };

  const adapter = {
    id: "inventory",
    title: "Inventario",
    ariaLabel: "Inventario",
    pickerIcon: List,
    columns: INVENTORY_RECORD_INDEX_COLUMNS,
    source,
    selectable: true,
    rowOpen,
    emptyState: {
      icon: Package,
      title: "Add your first inventory item",
      description: "Add your first inventory item manually.",
    },
    class: styles.page,
  } satisfies RecordIndexAdapter<InventoryItemView>;

  return <RecordIndexScreen adapter={adapter} />;
}
