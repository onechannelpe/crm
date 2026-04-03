import { AppPage } from "~/components/layout/page";
import { SalesRecordIndex } from "~/features/pipeline/record-index/sales/adapter";

export default function LeadSalesPage() {
  return (
    <AppPage>
      <SalesRecordIndex />
    </AppPage>
  );
}
