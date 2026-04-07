import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createInventoryDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import type { InventoryItemView } from "~/server/inventory/application/views/inventory-item-view";

export function useOpenInventoryRecord() {
  const rowOpen = useSidePanelRowOpen<InventoryItemView>((item) =>
    createInventoryDetailSidePanelPage({
      inventoryItemId: item.id,
      productName: item.productName,
      serialNumber: item.serialNumber,
      category: item.category,
      status: item.status,
      createdAt: item.createdAt,
    }),
  );

  return { rowOpen };
}
