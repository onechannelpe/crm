import type { Accessor } from "solid-js";
import { createStore } from "solid-js/store";

import type { LeadListRowView } from "~/server/pipeline/application/queries/views/lead-list";
import { asLeadId } from "~/server/pipeline/domain/lead-record";

export type OptimisticLeadRow = LeadListRowView & {
  optimisticClientKey: string;
};

const [state, setState] = createStore<Record<string, OptimisticLeadRow[]>>({});

export function createOptimisticLeadRow(input: {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  executiveName: string;
  now?: number;
}): OptimisticLeadRow {
  const now = input.now ?? Date.now();
  const optimisticClientKey = `new:${input.ruc}:${now}`;

  return {
    id: asLeadId(`optimistic:${optimisticClientKey}`),
    ruc: input.ruc,
    razonSocial: input.razonSocial,
    address: input.address,
    executiveId: input.executiveId,
    executiveName: input.executiveName,
    stage: "PENDING_EXTERNAL_REVIEW",
    status: null,
    prioridad: null,
    nextStep: "Review lead",
    createdAt: now,
    updatedAt: now,
    optimisticClientKey,
  };
}

/**
 * Read optimistic rows for a given key reactively.
 * Safe to call inside source() or other reactive contexts.
 */
export function getOptimisticLeadRows(key: string): OptimisticLeadRow[] {
  return state[key] ?? [];
}

/**
 * Returns a stable accessor for a given key.
 * Use this when you need a fixed Accessor<T> reference outside a reactive context.
 */
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
