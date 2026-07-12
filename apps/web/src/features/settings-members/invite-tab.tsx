import { Suspense } from "solid-js";

import { BulkImportSection } from "./bulk-import-section";
import { TeamInviteManagementSection } from "./team-invite-management-section";

export function InviteTab() {
  return (
    <Suspense>
      <TeamInviteManagementSection />
      <BulkImportSection />
    </Suspense>
  );
}
