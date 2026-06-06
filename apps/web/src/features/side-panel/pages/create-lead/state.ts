import { createMemo } from "solid-js";

import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import {
  recordTabDisplayLabel,
  resolveActiveRecordTabId,
} from "~/features/record-show/tabs/record-tabs-registry";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";

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

  function setActiveTab(activeTab: RecordTabId) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "create-lead") return state;
      return { ...state, draft: { ...state.draft, activeTab } };
    });
  }

  const draftRuc = createMemo(() => pageState().draft.ruc);
  const activeTab = createMemo<RecordTabId>(() =>
    resolveActiveRecordTabId(pageState().draft.activeTab, "draft"),
  );
  const label = createMemo(() => recordTabDisplayLabel(activeTab()));

  return { draftRuc, activeTab, label, setRuc, setActiveTab };
}
