import { createMemo } from "solid-js";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { LeadCreateSidePanelPageState } from "../../types/side-panel-page";
import type { LeadCreateTabId } from "./model";

const LABEL_BY_TAB: Record<LeadCreateTabId, string> = {
  home: "Borrador",
  timeline: "Línea de tiempo",
  tasks: "Tareas",
  notes: "Notas",
  files: "Archivos",
  emails: "Emails",
  calendar: "Calendario",
};

export function useLeadCreatePageState() {
  const pageId = usePageInstanceId();
  const { updatePageState } = useSidePanel();
  const pageState = useSidePanelPageState("lead-create");

  function updateDraft(
    updater: (
      draft: LeadCreateSidePanelPageState["draft"],
    ) => LeadCreateSidePanelPageState["draft"],
  ) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "lead-create") {
        return state;
      }

      return {
        ...state,
        draft: updater(state.draft),
      };
    });
  }

  function setRuc(ruc: string) {
    updateDraft((draft) => ({
      ...draft,
      ruc,
    }));
  }

  function setActiveTab(activeTab: LeadCreateTabId) {
    updateDraft((draft) => ({
      ...draft,
      activeTab,
    }));
  }

  const label = createMemo(() => {
    return LABEL_BY_TAB[pageState().draft.activeTab];
  });

  return {
    pageState,
    label,
    setRuc,
    setActiveTab,
  };
}
