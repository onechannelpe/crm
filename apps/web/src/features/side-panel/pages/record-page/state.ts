import { createMemo } from "solid-js";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { LeadRecordTabId } from "./model";

export function useLeadRecordPageState() {
  const pageId = usePageInstanceId();
  const { updatePageState } = useSidePanel();
  const pageState = useSidePanelPageState("view-record");

  function setActiveTab(activeTab: LeadRecordTabId) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "view-record") return state;
      return { ...state, activeTab };
    });
  }

  const leadId = createMemo(() => pageState().leadId);

  const activeTab = createMemo<LeadRecordTabId>(() => pageState().activeTab);

  const label = createMemo(() => pageState().subtitle);

  return {
    pageState,
    leadId,
    activeTab,
    label,
    setActiveTab,
  };
}
