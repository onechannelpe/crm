import { AppPage } from "~/components/layout/page";
import { QuotationsRecordIndex } from "~/features/record-index/adapters/quotations";

export default function QuotationsPage() {
  return (
    <AppPage>
      <QuotationsRecordIndex />
    </AppPage>
  );
}
