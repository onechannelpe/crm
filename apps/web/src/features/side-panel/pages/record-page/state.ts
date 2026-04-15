import { createMemo } from "solid-js";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { LeadRecordTabId } from "./model";

const LABEL_BY_TAB: Record<LeadRecordTabId, string> = {
  home: "Borrador",
  timeline: "Línea de tiempo",
  tasks: "Tareas",
  notes: "Notas",
  files: "Archivos",
  emails: "Emails",
  calendar: "Calendario",
};

export function useLeadRecordPageState() {
  const pageId = usePageInstanceId();
  const { updatePageState } = useSidePanel();
  const pageState = useSidePanelPageState("view-record");

  function setRuc(ruc: string) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "view-record" || state.mode !== "create") {
        return state;
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          ruc,
        },
      };
    });
  }

  function setActiveTab(activeTab: LeadRecordTabId) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "view-record") {
        return state;
      }

      if (state.mode === "create") {
        return {
          ...state,
          draft: {
            ...state.draft,
            activeTab,
          },
        };
      }

      return {
        ...state,
        activeTab,
      };
    });
  }

  const activeTab = createMemo<LeadRecordTabId>(() => {
    const state = pageState();
    if (state.mode === "create") {
      return state.draft.activeTab;
    }

    return state.activeTab;
  });

  const label = createMemo(() => {
    const state = pageState();
    if (state.mode === "create") {
      return LABEL_BY_TAB[state.draft.activeTab];
    }

    return state.subtitle;
  });

  return {
    pageState,
    activeTab,
    label,
    setRuc,
    setActiveTab,
  };
}
