import { createMemo } from "solid-js";

import { useSidePanelPageInstanceId } from "../../state/side-panel-page-instance";
import { useSidePanel } from "../../state/use-side-panel";
import { SidePanelPageInfoLayout } from "../../top-bar/side-panel-page-info-layout";

export function SidePanelSearchPersonPageInfo() {
  const pageId = useSidePanelPageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "search-person-detail") {
      throw new Error(
        "Search person side panel page info state is not available",
      );
    }

    return state;
  });

  return (
    <SidePanelPageInfoLayout
      title={pageState().person.displayName}
      label={`Resultado de "${pageState().query}"`}
    />
  );
}
