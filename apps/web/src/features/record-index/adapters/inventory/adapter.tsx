import { createAsync } from "@solidjs/router";

import List from "~/components/icons/list";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type { RecordIndexAdapter } from "~/features/record-index/model/types";
import { inventoryItemsQuery } from "~/lib/queries/inventory";

import type { InventoryRow } from "./columns";
import { INVENTORY_RECORD_INDEX_COLUMNS } from "./columns";
import { InventoryRecordIndexEmptyState } from "./empty-state";
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
    rowOpen,
    emptyState: <InventoryRecordIndexEmptyState />,
    class: styles.page,
  } satisfies RecordIndexAdapter<InventoryRow>;

  return <RecordIndexScreen adapter={adapter} />;
}
