import { createMemo } from "solid-js";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { ViewRecordTabId } from "./model";
import { VIEW_RECORD_TABS, getInitialActiveTabId } from "./tabs/tab-registry";

export function useLeadRecordPageState() {
  const pageId = usePageInstanceId();
  const { updatePageState } = useSidePanel();
  const pageState = useSidePanelPageState("view-record");

  function setActiveTab(activeTab: ViewRecordTabId) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "view-record") return state;
      return { ...state, activeTab };
    });
  }

  const leadId = createMemo(() => pageState().leadId);

  const activeTab = createMemo<ViewRecordTabId>(() =>
    getInitialActiveTabId({
      activeTabId: pageState().activeTab,
      tabs: VIEW_RECORD_TABS,
    }),
  );

  const label = createMemo(() => pageState().subtitle);

  return {
    pageState,
    leadId,
    activeTab,
    label,
    setActiveTab,
  };
}
