import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createLeadDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";

import type { LeadRow } from "./columns";

export function useOpenLeadRecord() {
  const { openPanel } = useSidePanel();

  return {
    openLeadRecord(lead: Pick<LeadRow, "id" | "ruc" | "razon_social">) {
      openPanel(
        createLeadDetailSidePanelPage({
          leadId: lead.id,
          title: lead.razon_social || lead.ruc,
          subtitle: `RUC ${lead.ruc}`,
        }),
      );
    },
  };
}
