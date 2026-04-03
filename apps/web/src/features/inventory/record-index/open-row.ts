import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createInventoryDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";

import type { InventoryRow } from "./columns";

export function useOpenInventoryRecord() {
  const rowOpen = useSidePanelRowOpen<InventoryRow>((item) =>
    createInventoryDetailSidePanelPage({
      inventoryItemId: item.id,
      productName: item.productName,
      serialNumber: item.serial_number,
      category: item.category,
      status: item.status,
      createdAt: item.created_at,
    }),
  );

  return { rowOpen };
}
