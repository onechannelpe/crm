import { AppPage } from "~/components/layout/page";
import { QuotationsRecordIndex } from "~/features/record-index/adapters/quotations/adapter";

export default function QuotationsPage() {
  return (
    <AppPage>
      <QuotationsRecordIndex />
    </AppPage>
  );
}
