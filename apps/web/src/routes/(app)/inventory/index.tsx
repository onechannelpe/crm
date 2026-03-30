import { AppPage } from "~/components/layout/page";
import { InventoryRecordIndex } from "~/features/record-index/adapters/inventory/adapter";

export default function InventoryPage() {
  return (
    <AppPage>
      <InventoryRecordIndex />
    </AppPage>
  );
}
