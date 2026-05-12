import { createMemo } from "solid-js";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { ViewRecordTabId } from "./model";
import {
  VIEW_RECORD_TABS,
  VIEW_RECORD_TABS_BY_ID,
  resolveActiveTabId,
} from "./tabs/tab-registry";

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
    resolveActiveTabId({
      activeTabId: pageState().activeTab,
      tabById: VIEW_RECORD_TABS_BY_ID,
      defaultTabId: VIEW_RECORD_TABS[0].id,
    }),
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
