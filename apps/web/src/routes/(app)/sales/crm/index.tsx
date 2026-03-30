import { AppPage } from "~/components/layout/page";
import { SalesRecordIndex } from "~/features/record-index/adapters/sales";

export default function LeadSalesPage() {
  return (
    <AppPage>
      <SalesRecordIndex />
    </AppPage>
  );
}
