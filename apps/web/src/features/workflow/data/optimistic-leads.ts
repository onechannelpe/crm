import type { Accessor } from "solid-js";
import { createStore } from "solid-js/store";

import type { LeadListRowView } from "~/contracts/workflow/views";

export type OptimisticLeadRow = LeadListRowView & {
  optimisticClientKey: string;
};

const [state, setState] = createStore<Record<string, OptimisticLeadRow[]>>({});

let nextOptimisticLeadId = -1;

export function createOptimisticLeadRow(input: {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  executiveName: string;
  createdBy: number;
  createdByName: string;
  now?: number;
}): OptimisticLeadRow {
  const now = input.now ?? Date.now();

  return {
    id: `optimistic-${nextOptimisticLeadId--}`,
    ruc: input.ruc,
    razonSocial: input.razonSocial,
    address: input.address,
    executiveId: input.executiveId,
    executiveName: input.executiveName,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    stage: "QUALIFYING",
    status: null,
    prioridad: null,
    nextStep: "NO_ACTION",
    createdAt: now,
    updatedAt: now,
    optimisticClientKey: `new:${input.ruc}:${now}`,
  };
}

/** Reactive read for source() and other tracking contexts. */
export function getOptimisticLeadRows(key: string): OptimisticLeadRow[] {
  return state[key] ?? [];
}

/** Stable accessor for callers that need a fixed Accessor<T> reference. */
export function useOptimisticLeadRows(
  key: string,
): Accessor<OptimisticLeadRow[]> {
  return () => state[key] ?? [];
}

export function addOptimisticLead(
  keys: string[],
  row: OptimisticLeadRow,
): () => void {
  for (const key of keys) {
    setState(key, (current) => [row, ...(current ?? [])]);
  }

  return () => {
    for (const key of keys) {
      setState(key, (current) =>
        (current ?? []).filter(
          (candidate) =>
            candidate.optimisticClientKey !== row.optimisticClientKey,
        ),
      );
    }
  };
}
