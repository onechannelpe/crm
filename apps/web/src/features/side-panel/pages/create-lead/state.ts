import { createMemo } from "solid-js";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { CreateLeadTabId } from "../record-page/model";
import {
  CREATE_LEAD_TABS,
  getInitialActiveTabId,
  getTabInfoLabel,
} from "../record-page/tabs/tab-registry";

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
  const activeTab = createMemo<CreateLeadTabId>(() =>
    getInitialActiveTabId({
      activeTabId: pageState().draft.activeTab,
      tabs: CREATE_LEAD_TABS,
    }),
  );
  const label = createMemo(() =>
    getTabInfoLabel(CREATE_LEAD_TABS, activeTab()),
  );

  return { draftRuc, activeTab, label, setRuc, setActiveTab };
}
