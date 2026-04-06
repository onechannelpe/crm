import type { LeadListRow } from "~/actions/pipeline/queries/leads";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createLeadDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";

export function useOpenLeadRecord() {
  const rowOpen = useSidePanelRowOpen<
    Pick<LeadListRow, "id" | "ruc" | "razonSocial">
  >((lead) =>
    createLeadDetailSidePanelPage({
      leadId: lead.id,
      title: lead.razonSocial || lead.ruc,
      subtitle: `RUC ${lead.ruc}`,
    }),
  );

  return {
    rowOpen,
  };
}
