import { AppPage } from "~/components/layout/page";
import { SalesCrmRecordIndex } from "~/features/record-index/adapters/sales-crm";

export default function LeadSalesPage() {
  return (
    <AppPage>
      <SalesCrmRecordIndex />
    </AppPage>
  );
}
