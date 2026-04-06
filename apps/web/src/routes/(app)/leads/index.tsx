import { AppPage } from "~/components/layout/page";
import { LeadsRecordIndex } from "~/features/pipeline/record-index/leads/adapter";

export default function LeadsPage() {
  return (
    <AppPage>
      <LeadsRecordIndex />
    </AppPage>
  );
}
