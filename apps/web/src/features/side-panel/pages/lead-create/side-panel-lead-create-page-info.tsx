import Building2 from "~/components/icons/building-2";

import { SidePanelPageInfoLayout } from "../../top-bar/side-panel-page-info-layout";

export function SidePanelLeadCreatePageInfo() {
  return (
    <SidePanelPageInfoLayout
      icon={<Building2 size={14} />}
      title="Nuevo prospecto"
    />
  );
}
