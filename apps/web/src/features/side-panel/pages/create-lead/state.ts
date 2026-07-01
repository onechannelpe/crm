import { createMemo } from "solid-js";

import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import {
  recordTabDisplayLabel,
  resolveActiveRecordTabId,
} from "~/features/record-show/tabs/record-tabs-registry";
import type { CommercialScopeFormValues } from "~/features/workflow/forms/commercial-scope/values";

import { usePageInstanceId } from "../../router/page-instance-context";
import { useSidePanelPageState } from "../../router/page-state";
import { useSidePanel } from "../../state/use-side-panel";
import type { LeadRecordDraftState } from "./draft-state";

export function useCreateLeadPageState() {
  const pageId = usePageInstanceId();
  const { updatePageState } = useSidePanel();
  const pageState = useSidePanelPageState("create-lead");

  function patchDraft(patch: Partial<LeadRecordDraftState>) {
    updatePageState(pageId(), (state) => {
      if (state.page !== "create-lead") return state;
      return { ...state, draft: { ...state.draft, ...patch } };
    });
  }

  const setRuc = (ruc: string) => patchDraft({ ruc });
  const setActiveTab = (activeTab: RecordTabId) => patchDraft({ activeTab });

  function setScopeField<K extends keyof CommercialScopeFormValues>(
    key: K,
    value: CommercialScopeFormValues[K],
  ) {
    patchDraft({ [key]: value } as Partial<LeadRecordDraftState>);
  }

  const draftRuc = createMemo(() => pageState().draft.ruc);
  const draftScope = createMemo<CommercialScopeFormValues>(() => {
    const draft = pageState().draft;
    return {
      currentProvider: draft.currentProvider,
      currentDebitRate: draft.currentDebitRate,
      currentCreditRate: draft.currentCreditRate,
      gpv: draft.gpv,
      ticket: draft.ticket,
      lineOfBusiness: draft.lineOfBusiness,
      settlementBank: draft.settlementBank,
      posCount: draft.posCount,
    };
  });
  const activeTab = createMemo<RecordTabId>(() =>
    resolveActiveRecordTabId(pageState().draft.activeTab, "draft"),
  );
  const label = createMemo(() => recordTabDisplayLabel(activeTab()));

  return {
    draftRuc,
    draftScope,
    activeTab,
    label,
    setRuc,
    setScopeField,
    setActiveTab,
  };
}
