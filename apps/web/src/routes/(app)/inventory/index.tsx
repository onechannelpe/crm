import { AppPage } from "~/components/layout/page";
import { InventoryRecordIndex } from "~/features/inventory/record-index/adapter";

export default function InventoryPage() {
  return (
    <AppPage>
      <InventoryRecordIndex />
    </AppPage>
  );
}
