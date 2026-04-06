import { AppPage } from "~/components/layout/page";
import { QuotationsRecordIndex } from "~/features/pipeline/record-index/quotations/adapter";

export default function QuotationsPage() {
  return (
    <AppPage>
      <QuotationsRecordIndex />
    </AppPage>
  );
}
