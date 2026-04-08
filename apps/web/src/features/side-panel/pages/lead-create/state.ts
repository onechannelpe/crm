import { createMemo } from "solid-js";

import { usePageInstanceId } from "../../state/page-instance";
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
  const { getPageState, updatePageState } = useSidePanel();

  const pageState = createMemo<LeadCreateSidePanelPageState>(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "lead-create") {
      throw new Error("Lead create side panel page state is not available");
    }

    return state;
  });

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

  const title = createMemo(() => {
    const ruc = pageState().draft.ruc.trim();

    if (ruc.length > 0) {
      return ruc;
    }

    return "Nuevo prospecto";
  });

  const label = createMemo(() => {
    return LABEL_BY_TAB[pageState().draft.activeTab];
  });

  return {
    pageState,
    title,
    label,
    setRuc,
    setActiveTab,
  };
}
