import { createMemo } from "solid-js";

import Users from "~/components/icons/users";
import { useSidePanelPageInstanceId } from "../../state/side-panel-page-instance";
import { useSidePanel } from "../../state/use-side-panel";
import { SidePanelPageInfoLayout } from "../../top-bar/side-panel-page-info-layout";

export function SidePanelSearchCompanyPageInfo() {
  const pageId = useSidePanelPageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "search-company-detail") {
      throw new Error(
        "Search company side panel page info state is not available",
      );
    }

    return state;
  });

  return (
    <SidePanelPageInfoLayout
      icon={<Users size={14} />}
      title={pageState().company.name ?? "Unknown company"}
      label={`Resultado de "${pageState().query}"`}
    />
  );
}
