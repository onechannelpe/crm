import { createMemo } from "solid-js";

import Package from "~/components/icons/package";

import { usePageInstanceId } from "../../state/page-instance";
import { useSidePanel } from "../../state/use-side-panel";
import { PageInfoLayout } from "../../top-bar/page-info-layout";

export function InventoryDetailPageInfo() {
  const pageId = usePageInstanceId();
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
    <PageInfoLayout
      icon={<Package size={14} />}
      title={pageState().productName}
      label={pageState().serialNumber}
    />
  );
}
