import { createMemo } from "solid-js";

import Building2 from "~/components/icons/building-2";

import { useSidePanelPageInstanceId } from "../../state/side-panel-page-instance";
import { useSidePanel } from "../../state/use-side-panel";
import { SidePanelPageInfoLayout } from "../../top-bar/side-panel-page-info-layout";

export function SidePanelLeadDetailPageInfo() {
  const pageId = useSidePanelPageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "lead-detail") {
      throw new Error(
        "Lead detail side panel page info state is not available",
      );
    }

    return state;
  });

  return (
    <SidePanelPageInfoLayout
      icon={<Building2 size={14} />}
      title={pageState().title}
      label={pageState().subtitle}
    />
  );
}
