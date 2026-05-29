import type { LeadDetailView } from "~/contracts/workflow/views";
import { FilesCard } from "~/features/side-panel/pages/record-page/tabs/files-card";

export function FilesTab(props: { data: LeadDetailView }) {
  return (
    <FilesCard
      leadId={props.data.lead.id}
      canUpload={props.data.lead.stage === "LIVE"}
      negotiationRequests={props.data.negotiationRequests}
    />
  );
}
