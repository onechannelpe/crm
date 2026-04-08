import Package from "~/components/icons/package";

import { useSidePanelPageState } from "../../state/page-frame";
import { PageInfoLayout } from "../../top-bar/page-info-layout";

export function InventoryDetailPageInfo() {
  const pageState = useSidePanelPageState("inventory-detail");

  return (
    <PageInfoLayout
      icon={<Package size={14} />}
      title={pageState().productName}
      label={pageState().serialNumber}
    />
  );
}
