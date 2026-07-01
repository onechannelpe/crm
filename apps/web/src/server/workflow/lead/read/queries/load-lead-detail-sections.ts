import { createLogger } from "~/lib/observability/logger";
import type { OrganizationRepository } from "~/server/organization/organization-repo";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type {
  FileAssetId,
  UserId,
  WorkflowArtifactId,
  WorkflowLeadId,
  WorkflowRateRevisionId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { DigitalPolicyRepository } from "~/server/workflow/lead/digital-policy/repo";
import type { LeadHistoryEntry } from "~/server/workflow/lead/domain/history";
import type {
  RateProposal,
  RateRevision,
} from "~/server/workflow/lead/domain/rows";
import type {
  LeadCommercialScope,
  LeadState,
} from "~/server/workflow/lead/domain/state";
import type {
  FulfillmentOrderDetails,
  FulfillmentRepository,
} from "~/server/workflow/lead/fulfillment/repo";
import type { LeadHistoryRepository } from "~/server/workflow/lead/read/history/history-repo";
import type { LeadFavoriteRepository } from "~/server/workflow/lead/read/lead-favorite-repo";
import type {
  LeadDetailReader,
  RateProposalReader,
  RateRevisionReader,
  SourceStatusReader,
} from "~/server/workflow/lead/read/ports";
import type {
  LeadUserWithName,
  WorkflowUserRepository,
} from "~/server/workflow/lead/read/users-repo";
import type {
  LeadVenue,
  LeadVenueRepository,
} from "~/server/workflow/lead/venue/repo";

const logger = createLogger("workflow-get-lead-detail");

function isRecoverableSectionError(error: DomainError): boolean {
  return error.kind === "external";
}

function reportSectionDegradation(section: string, error: DomainError): void {
  logger.error("workflow_lead_detail_degraded_section", {
    section,
    domainKind: error.kind,
    domainCode: error.code,
    domainInternalMessage:
      "internalMessage" in error ? error.internalMessage : undefined,
    domainDetails: error.details,
  });
}

export type RateRevisionFilesQuery = {
  listByRevisionId(revisionId: WorkflowRateRevisionId): Promise<
    Array<{
      artifactId: WorkflowArtifactId;
      revisionId: WorkflowRateRevisionId;
      fileAssetId: FileAssetId;
      uploadedByUserId: UserId;
      createdAt: Date;
      safeDisplayFilename: string;
      detectedMime: string;
      sizeBytes: number;
    }>
  >;
};

export type LeadDetailQueryDeps = {
  leads: LeadDetailReader;
  leadFavorites: LeadFavoriteRepository;
  digitalPolicies: DigitalPolicyRepository;
  leadHistory: LeadHistoryRepository;
  rateProposals: RateProposalReader;
  leadVenues: LeadVenueRepository;
  rateRevisions: RateRevisionReader;
  rateRevisionFiles: RateRevisionFilesQuery;
  sourceStatuses: SourceStatusReader;
  users: WorkflowUserRepository;
  organization: OrganizationRepository;
  fulfillment: FulfillmentRepository;
};

export type LeadDetailLoadedSections = {
  lead: LeadState;
  commercialScope: LeadCommercialScope;
  isFavorite: boolean;
  digitalPolicy: Awaited<ReturnType<DigitalPolicyRepository["findByLeadId"]>>;
  rateProposals: RateProposal[];
  venues: LeadVenue[];
  rateRevisionRows: RateRevision[];
  history: LeadHistoryEntry[];
  sourceStatus: Awaited<ReturnType<SourceStatusReader["findByRuc"]>>;
  userRows: LeadUserWithName[];
  organization: NonNullable<
    Awaited<ReturnType<OrganizationRepository["findOrganizationById"]>>
  >;
  legalRepresentative: Awaited<
    ReturnType<OrganizationRepository["findPrimaryRepresentative"]>
  >;
  rateRevisions: Array<{
    revision: RateRevision;
    files: Awaited<ReturnType<RateRevisionFilesQuery["listByRevisionId"]>>;
  }>;
  fulfillment: FulfillmentOrderDetails | null;
};

export async function loadLeadDetailSections(
  deps: LeadDetailQueryDeps,
  input: { leadId: WorkflowLeadId; actorUserId: UserId },
): Promise<Result<LeadDetailLoadedSections, DomainError>> {
  const lead = await deps.leads.findById(input.leadId);
  if (!lead) {
    return Err(fail("lead_not_found"));
  }

  const commercialScope = await deps.leads.findCommercialScope(input.leadId);
  if (!commercialScope) {
    return Err(fail("lead_commercial_scope_missing"));
  }

  const [
    isFavorite,
    digitalPolicy,
    rateProposals,
    venuesResult,
    rateRevisionRows,
    historyResult,
    sourceStatus,
    userRows,
    organization,
    legalRepresentative,
    fulfillment,
  ] = await Promise.all([
    deps.leadFavorites.isFavoriteForUser({
      leadId: input.leadId,
      userId: input.actorUserId,
    }),
    deps.digitalPolicies.findByLeadId(input.leadId),
    deps.rateProposals.listByLeadId(input.leadId),
    deps.leadVenues.listByLeadId(input.leadId),
    deps.rateRevisions.listByLeadId(input.leadId),
    deps.leadHistory.listByLeadId(input.leadId),
    deps.sourceStatuses.findByRuc(lead.ruc),
    deps.users.findByIds([
      lead.executiveId,
      lead.createdBy,
      ...(lead.updatedBy ? [lead.updatedBy] : []),
    ]),
    deps.organization.findOrganizationById(lead.organizationId),
    deps.organization.findPrimaryRepresentative(lead.organizationId),
    deps.fulfillment.findByLeadId(input.leadId),
  ]);

  if (!historyResult.ok && !isRecoverableSectionError(historyResult.error)) {
    return historyResult;
  }
  if (!venuesResult.ok && !isRecoverableSectionError(venuesResult.error)) {
    return venuesResult;
  }
  if (!organization) {
    return Err(
      fail("lead_organization_not_found", {
        details: {
          leadId: lead.id,
          organizationId: lead.organizationId,
        },
      }),
    );
  }

  const history = historyResult.ok ? historyResult.value : [];
  const venues = venuesResult.ok ? venuesResult.value : [];
  if (!historyResult.ok) {
    reportSectionDegradation("history", historyResult.error);
  }
  if (!venuesResult.ok) {
    reportSectionDegradation("venues", venuesResult.error);
  }

  const rateRevisions = await Promise.all(
    rateRevisionRows.map(async (revision) => ({
      revision,
      files: await deps.rateRevisionFiles.listByRevisionId(revision.id),
    })),
  );

  return Ok({
    lead,
    commercialScope,
    isFavorite,
    digitalPolicy,
    rateProposals,
    venues,
    rateRevisionRows,
    history,
    sourceStatus,
    userRows,
    organization,
    legalRepresentative,
    rateRevisions,
    fulfillment,
  });
}
