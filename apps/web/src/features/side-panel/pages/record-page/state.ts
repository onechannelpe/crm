import { createMemo, createSignal } from "solid-js";

import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import { resolveActiveRecordTabId } from "~/features/record-show/tabs/record-tabs-registry";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";

export function useLeadRecordPageState() {
  const pageId = usePageInstanceId();
  const { updatePageState } = useSidePanel();
  const pageState = useSidePanelPageState("view-record");
  const [subtitle, setSubtitle] = createSignal(pageState().subtitle);

  function setActiveTab(activeTab: RecordTabId) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "view-record") {
        return state;
      }
      return { ...state, activeTab };
    });
  }

  const leadId = createMemo(() => pageState().leadId);

  const activeTab = createMemo<RecordTabId>(() =>
    resolveActiveRecordTabId(pageState().activeTab, "lead"),
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
