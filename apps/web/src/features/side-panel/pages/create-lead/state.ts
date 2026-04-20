import { createMemo } from "solid-js";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { LeadRecordTabId } from "../record-page/model";

const LABEL_BY_TAB: Record<LeadRecordTabId, string> = {
  home: "Borrador",
  timeline: "Línea de tiempo",
  tasks: "Tareas",
  notes: "Notas",
  files: "Archivos",
  emails: "Emails",
  calendar: "Calendario",
};

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

  function setActiveTab(activeTab: LeadRecordTabId) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "create-lead") return state;
      return { ...state, draft: { ...state.draft, activeTab } };
    });
  }

  const draftRuc = createMemo(() => pageState().draft.ruc);
  const activeTab = createMemo(() => pageState().draft.activeTab);
  const label = createMemo(() => LABEL_BY_TAB[activeTab()]);

  return { draftRuc, activeTab, label, setRuc, setActiveTab };
}
