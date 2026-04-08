import type { Accessor } from "solid-js";
import { createStore } from "solid-js/store";

import type { LeadListRowView } from "~/server/pipeline/application/queries/views/lead-list";

import type { LeadListId } from "./types";

export type OptimisticLeadRow = LeadListRowView & {
  optimisticClientKey: string;
};

const [state, setState] = createStore<Record<LeadListId, OptimisticLeadRow[]>>({
  all: [],
  review: [],
  quotation: [],
});

let nextOptimisticLeadId = -1;

export function useOptimisticLeadRows(
  listId: LeadListId,
): Accessor<OptimisticLeadRow[]> {
  return () => state[listId];
}

export function createOptimisticLeadRow(input: {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId?: number;
  now?: number;
}): OptimisticLeadRow {
  const now = input.now ?? Date.now();

  return {
    id: nextOptimisticLeadId--,
    ruc: input.ruc,
    razonSocial: input.razonSocial,
    address: input.address,
    executiveId: input.executiveId ?? -1,
    stage: "PENDING_EXTERNAL_REVIEW",
    status: null,
    prioridad: null,
    nextStep: "Review lead",
    createdAt: now,
    updatedAt: now,
    optimisticClientKey: `new:${input.ruc}:${now}`,
  };
}

export function addOptimisticLead(
  listIds: LeadListId[],
  row: OptimisticLeadRow,
): () => void {
  for (const listId of listIds) {
    setState(listId, (current) => [row, ...current]);
  }

  return () => {
    for (const listId of listIds) {
      setState(listId, (current) =>
        current.filter(
          (candidate) =>
            candidate.optimisticClientKey !== row.optimisticClientKey,
        ),
      );
    }
  };
}
