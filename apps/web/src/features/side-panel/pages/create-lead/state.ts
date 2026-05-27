import { createMemo } from "solid-js";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { CreateLeadTabId } from "../record-page/model";
import { CREATE_LEAD_TABS_BY_ID, resolveActiveCreateLeadTabId } from "./tabs";

export function useCreateLeadPageState() {
  const pageId = usePageInstanceId();
  const { updatePageState } = useSidePanel();
  const pageState = useSidePanelPageState("create-lead");

  function setRuc(ruc: string) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "create-lead") return state;
      return { ...state, draft: { ...state.draft, ruc } };
    });
  }

  function setActiveTab(activeTab: CreateLeadTabId) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "create-lead") return state;
      return { ...state, draft: { ...state.draft, activeTab } };
    });
  }

  const draftRuc = createMemo(() => pageState().draft.ruc);
  const activeTab = createMemo<CreateLeadTabId>(() => {
    return resolveActiveCreateLeadTabId(pageState().draft.activeTab);
  });
  const label = createMemo(() => {
    const tab = CREATE_LEAD_TABS_BY_ID[activeTab()];
    return tab.infoLabel ?? tab.label;
  });

  return { draftRuc, activeTab, label, setRuc, setActiveTab };
}
