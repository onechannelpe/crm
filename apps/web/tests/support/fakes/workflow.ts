import { vi } from "vitest";

import { Ok } from "~/server/shared/result";
import type { NegotiationRequestRepository } from "~/server/workflow/application/ports/entities";
import type {
  CommitResult,
  LeadUnitOfWork,
} from "~/server/workflow/application/ports/uow";
import type { LeadState } from "~/server/workflow/domain/lead/state";
import type { LeadStateRepository } from "~/server/workflow/infrastructure/lead-state-repo";

export function makeWorkflowLead(overrides: Partial<LeadState> = {}): LeadState {
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
    version: 1,
    ...overrides,
  };
}

export function makeLeadStates(lead: LeadState): LeadStateRepository {
  return {
    findById: async () => lead,
  };
}

export function makeUow(commit?: LeadUnitOfWork["commit"]) {
  const defaultCommit = vi.fn<LeadUnitOfWork["commit"]>(async () =>
    Ok({ eventIds: ["event-1"], wasIdempotent: false } satisfies CommitResult),
  );
  const commitMock = commit ?? defaultCommit;
  return {
    uow: { commit: commitMock } satisfies LeadUnitOfWork,
    commit: commitMock,
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
