import { createMemo } from "solid-js";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { ViewRecordTabId } from "./tab-ids";
import { resolveActiveViewRecordTabId } from "./tabs/view-record-tabs";

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

  function setSubtitle(subtitle: string) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "view-record") return state;
      return { ...state, subtitle };
    });
  }

  const leadId = createMemo(() => pageState().leadId);

  const activeTab = createMemo<ViewRecordTabId>(() =>
    resolveActiveViewRecordTabId(pageState().activeTab),
  );

  const label = createMemo(() => pageState().subtitle);

  return {
    pageState,
    leadId,
    activeTab,
    label,
    setActiveTab,
    setSubtitle,
  };
}
