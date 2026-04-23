import { AppPage } from "~/components/layout/page";
import { LeadsWorkspace } from "~/features/workflow/workspace/adapter";

export default function LeadsPage() {
  return (
    <AppPage>
      <LeadsWorkspace />
    </AppPage>
  );
}
