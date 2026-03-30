import { AppPage } from "~/components/layout/page";
import { SalesRecordIndex } from "~/features/record-index/adapters/sales/adapter";

export default function LeadSalesPage() {
  return (
    <AppPage>
      <SalesRecordIndex />
    </AppPage>
  );
}
