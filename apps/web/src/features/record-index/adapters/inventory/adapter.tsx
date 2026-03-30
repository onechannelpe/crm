import { createAsync } from "@solidjs/router";

import List from "~/components/icons/list";
import { DataGridToolbar } from "~/features/data-grid/components/toolbar";
import { createDataGridSelection } from "~/features/data-grid/hooks/use-selection";
import { RecordIndexPage } from "~/features/record-index/components/page";
import { RecordIndexGrid } from "~/features/record-index/components/table";
import { useRecordIndexAdapter } from "~/features/record-index/hooks/use-adapter";
import { inventoryItemsQuery } from "~/lib/queries/inventory";

import { INVENTORY_RECORD_INDEX_COLUMNS } from "./columns";
import { InventoryRecordIndexEmptyState } from "./empty-state";
import { useOpenInventoryRecord } from "./open-row";

import styles from "./styles.module.css";

export function InventoryRecordIndex() {
  const items = createAsync(() => inventoryItemsQuery(), { initialValue: [] });
  const selection = createDataGridSelection(items);
  const { rowOpen } = useOpenInventoryRecord();

  const adapter = useRecordIndexAdapter({
    id: "inventory",
    title: "Inventario",
    columns: [...INVENTORY_RECORD_INDEX_COLUMNS],
    getRows: items,
    rowOpen,
    emptyState: <InventoryRecordIndexEmptyState />,
  });

  return (
    <RecordIndexPage class={styles.page}>
      <DataGridToolbar
        picker={{
          icon: List,
          label: adapter.title,
          count: adapter.getRows().length,
        }}
        rightContent={<></>}
      />

      <RecordIndexGrid
        ariaLabel="Inventario"
        columns={adapter.columns}
        emptyState={adapter.emptyState}
        rowOpen={adapter.rowOpen}
        rows={adapter.getRows()}
        selection={selection}
      />
    </RecordIndexPage>
  );
}
