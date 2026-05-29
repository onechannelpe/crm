import { createMemo, createSignal } from "solid-js";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { ViewRecordTabId } from "./tab-ids";
import { resolveActiveViewRecordTabId } from "./tabs/view-record-tabs";

export function useLeadRecordPageState() {
  const pageId = usePageInstanceId();
  const { updatePageState } = useSidePanel();
  const pageState = useSidePanelPageState("view-record");
  const [subtitle, setSubtitle] = createSignal(pageState().subtitle);

  function setActiveTab(activeTab: ViewRecordTabId) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "view-record") return state;
      return { ...state, activeTab };
    });
  }

  const leadId = createMemo(() => pageState().leadId);

  const activeTab = createMemo<ViewRecordTabId>(() =>
    resolveActiveViewRecordTabId(pageState().activeTab),
  );

  const label = createMemo(() => subtitle());

  return {
    pageState,
    leadId,
    activeTab,
    label,
    setActiveTab,
    setSubtitle,
  };
}
