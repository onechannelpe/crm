import { AppPage } from "~/components/layout/page";
import { LeadsRecordIndex } from "~/features/record-index/adapters/leads/adapter";

export default function LeadsPage() {
  return (
    <AppPage>
      <LeadsRecordIndex />
    </AppPage>
  );
}
