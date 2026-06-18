import { vi } from "vitest";

import { Ok } from "~/server/shared/result";
import type { RateRevisionRepository } from "~/server/workflow/application/ports/entities";
import type {
  CommitResult,
  LeadUnitOfWork,
} from "~/server/workflow/application/ports/uow";
import type { LeadState } from "~/server/workflow/domain/lead/state";
import type { LeadStateRepository } from "~/server/workflow/infrastructure/lead-state-repo";

export function makeWorkflowLead(
  overrides: Partial<LeadState> = {},
): LeadState {
  return {
    id: "lead-1",
    organizationId: "01974fd5-f261-7a7d-93f5-2f3d0f963121",
    ruc: "20100000001",
    legalName: "Org Test",
    address: null,
    district: null,
    department: null,
    executiveId: 1,
    createdBy: 1,
    updatedBy: null,
    stage: "PRICING",
    status: null,
    priority: null,
    createdAt: 10,
    updatedAt: 10,
    deletedAt: null,
    reservationExpiresAt: null,
    version: 1,
    ...overrides,
  };
}

export function makeLeadStates(lead: LeadState): LeadStateRepository {
  return {
    findById: async () => lead,
  };
}

export function makeUow(commit = makeCommitMock()) {
  return {
    uow: { commit } satisfies LeadUnitOfWork,
    commit,
  };
}

function makeCommitMock() {
  return vi.fn<LeadUnitOfWork["commit"]>(async () =>
    Ok({
      eventIds: ["event-1"],
      wasIdempotent: false,
    } satisfies CommitResult),
  );
}

export function makeRateRevisions(
  overrides: Partial<RateRevisionRepository> = {},
) {
  const insert = vi.fn<RateRevisionRepository["insert"]>();
  const insertFile = vi.fn<RateRevisionRepository["insertFile"]>();
  const findSubmitReadyRevisionFile = vi.fn<
    RateRevisionRepository["findSubmitReadyRevisionFile"]
  >(async ({ artifactId }) => ({ artifactId, fileAssetId: 10 }));
  const countByLeadId = vi.fn<RateRevisionRepository["countByLeadId"]>(
    async () => 0,
  );
  const listByLeadId = vi.fn<RateRevisionRepository["listByLeadId"]>(
    async () => [],
  );

  const repo = {
    insert,
    insertFile,
    findSubmitReadyRevisionFile,
    countByLeadId,
    listByLeadId,
    ...overrides,
  } satisfies RateRevisionRepository;

  return {
    repo,
    insert,
    insertFile,
    findSubmitReadyRevisionFile,
    countByLeadId,
    listByLeadId,
  };
}
