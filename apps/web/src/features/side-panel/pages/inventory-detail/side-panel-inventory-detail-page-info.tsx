import { createMemo } from "solid-js";

import Package from "~/components/icons/package";

import { useSidePanelPageInstanceId } from "../../state/side-panel-page-instance";
import { useSidePanel } from "../../state/use-side-panel";
import { SidePanelPageInfoLayout } from "../../top-bar/side-panel-page-info-layout";

export function SidePanelInventoryDetailPageInfo() {
  const pageId = useSidePanelPageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "inventory-detail") {
      throw new Error(
        "Inventory detail side panel page info state is not available",
      );
    }

    return state;
  });

  return (
    <SidePanelPageInfoLayout
      icon={<Package size={14} />}
      title={pageState().productName}
      label={pageState().serialNumber}
    />
  );
}
