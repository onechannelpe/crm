import { vi } from "vitest";

import { Ok } from "~/server/shared/result";
import type {
  LeadMutationOutcome,
  LeadMutationUow,
} from "~/server/workflow/application/ports/lead-mutation-uow";
import type { LeadReadRepository } from "~/server/workflow/application/ports/lead-read-repository";
import type { NegotiationRequestRepository } from "~/server/workflow/application/ports/negotiation-request-repository";
import type { LeadRecord } from "~/server/workflow/domain/lead-record";

export function makeWorkflowLead(
  overrides: Partial<LeadRecord> = {},
): LeadRecord {
  return {
    id: "lead-1",
    organizationId: "01974fd5-f261-7a7d-93f5-2f3d0f963121",
    ruc: "20100000001",
    razonSocial: "Org Test",
    address: null,
    district: null,
    department: null,
    executiveId: 1,
    createdBy: 1,
    updatedBy: null,
    stage: "QUOTED",
    status: null,
    prioridad: null,
    createdAt: 10,
    updatedAt: 10,
    ...overrides,
  };
}

export function makeLeadReader(lead: LeadRecord): LeadReadRepository {
  return {
    findById: async () => lead,
  };
}

export function makeMutationUow(commit?: LeadMutationUow["commit"]) {
  const defaultCommit = vi.fn<LeadMutationUow["commit"]>(async () =>
    Ok({
      events: {
        history: [],
        audit: { action: "test", entityId: "lead-1", changes: {} },
      },
      historyIds: [],
    } satisfies LeadMutationOutcome),
  );
  const commitMock = commit ?? defaultCommit;
  const commitChecked = vi.fn<LeadMutationUow["commitChecked"]>(async () =>
    Ok({ applied: true }),
  );
  const derivePatch = vi.fn<LeadMutationUow["derivePatch"]>(() => Ok({}));

  return {
    uow: {
      commit: commitMock,
      commitChecked,
      derivePatch,
    } satisfies LeadMutationUow,
    commit: commitMock,
    commitChecked,
    derivePatch,
  };
}

export function makeNegotiationRequests(
  overrides: Partial<NegotiationRequestRepository> = {},
) {
  const insert = vi.fn<NegotiationRequestRepository["insert"]>();
  const insertFile = vi.fn<NegotiationRequestRepository["insertFile"]>();
  const findFileAssetIdForArtifact = vi.fn<
    NegotiationRequestRepository["findFileAssetIdForArtifact"]
  >(async () => 10);
  const countByLeadId = vi.fn<NegotiationRequestRepository["countByLeadId"]>(
    async () => 0,
  );
  const listByLeadId = vi.fn<NegotiationRequestRepository["listByLeadId"]>(
    async () => [],
  );

  return {
    repo: {
      insert,
      insertFile,
      findFileAssetIdForArtifact,
      countByLeadId,
      listByLeadId,
      ...overrides,
    } satisfies NegotiationRequestRepository,
    insert,
    insertFile,
    findFileAssetIdForArtifact,
    countByLeadId,
    listByLeadId,
  };
}
