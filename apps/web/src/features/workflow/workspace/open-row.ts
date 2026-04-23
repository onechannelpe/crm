import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createLeadRecordDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import type { LeadListRowView } from "~/server/workflow/application/queries/views/lead-list";

export function useOpenLeadRecord() {
  const rowOpen = useSidePanelRowOpen<
    Pick<LeadListRowView, "id" | "ruc" | "razonSocial">
  >((lead) =>
    createLeadRecordDetailSidePanelPage({
      leadId: lead.id,
      title: lead.razonSocial ?? "",
      subtitle: lead.ruc,
    }),
  );

  return {
    rowOpen,
  };
}
