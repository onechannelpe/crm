import { AppPage } from "~/components/layout/page";
import { LeadsWorkspace } from "~/features/pipeline/workspace/adapter";

export default function LeadsPage() {
  return (
    <AppPage>
      <LeadsWorkspace />
    </AppPage>
  );
}
