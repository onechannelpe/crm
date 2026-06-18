import { type LeadListRowView } from "~/contracts/workflow/views";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createLeadRecordDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";

export function useOpenLeadRecord() {
  const rowOpen = useSidePanelRowOpen<
    Pick<LeadListRowView, "id" | "ruc" | "legalName" | "address">
  >((lead) =>
    createLeadRecordDetailSidePanelPage({
      leadId: lead.id,
      title: lead.legalName ?? "",
      subtitle: [lead.ruc, lead.address].filter(Boolean).join(" · "),
    }),
  );

  return {
    rowOpen,
  };
}
