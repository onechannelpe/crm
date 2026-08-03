import { createStore } from "solid-js/store";

import type { LeadListRowView } from "~/contracts/workflow/views";

const [state, setState] = createStore<Record<string, LeadListRowView[]>>({});

let nextOptimisticLeadId = -1;

export function createOptimisticLeadRow(input: {
  ruc: string;
  legalName: string | null;
  address: string | null;
  executiveId: string;
  executiveName: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
}): LeadListRowView {
  return {
    // The counter, not the submit instant, is what makes the row identifiable:
    // two submissions for the same RUC in the same millisecond would collide.
    id: `optimistic-${nextOptimisticLeadId--}`,
    ruc: input.ruc,
    legalName: input.legalName,
    address: input.address,
    executiveId: input.executiveId,
    executiveName: input.executiveName,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    stage: "QUALIFYING",
    status: null,
    priority: null,
    nextStep: "NO_ACTION",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

// Reactive read for source() and other tracking contexts.
export function getOptimisticLeadRows(key: string): LeadListRowView[] {
  return state[key] ?? [];
}

export function addOptimisticLead(
  keys: string[],
  row: LeadListRowView,
): () => void {
  for (const key of keys) {
    setState(key, (current) => [row, ...(current ?? [])]);
  }

  return () => {
    for (const key of keys) {
      setState(key, (current) =>
        (current ?? []).filter((candidate) => candidate.id !== row.id),
      );
    }
  };
}
