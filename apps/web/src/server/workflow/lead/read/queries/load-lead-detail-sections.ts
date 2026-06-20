import { createLogger } from "~/lib/observability/logger";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type {
  DigitalPolicyRepository,
  RateRevision,
  RateRevisionRepository,
  PartyRepository,
  RateProposal,
  RateProposalRepository,
  LeadVenue,
  LeadVenueRepository,
  SourceStatusRepository,
  LeadUserWithName,
  WorkflowUserRepository,
} from "~/server/workflow/infrastructure/ports/entities";
import type {
  LeadHistoryRepository,
  LeadFavoriteRepository,
  LeadRepository,
} from "~/server/workflow/infrastructure/ports/lead";
import type { LeadHistoryEntry } from "~/server/workflow/lead/domain/history";
import type {
  LeadCommercialScope,
  LeadState,
} from "~/server/workflow/lead/domain/state";

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
  listByRevisionId(revisionId: string): Promise<
    Array<{
      artifactId: string;
      revisionId: string;
      fileAssetId: number;
      uploadedByUserId: number;
      createdAt: number;
      safeDisplayFilename: string;
      detectedMime: string;
      sizeBytes: number;
    }>
  >;
};

export type LeadDetailQueryDeps = {
  leads: LeadRepository;
  leadFavorites: LeadFavoriteRepository;
  digitalPolicies: DigitalPolicyRepository;
  leadHistory: LeadHistoryRepository;
  rateProposals: RateProposalRepository;
  leadVenues: LeadVenueRepository;
  rateRevisions: RateRevisionRepository;
  rateRevisionFiles: RateRevisionFilesQuery;
  sourceStatuses: SourceStatusRepository;
  users: WorkflowUserRepository;
  party: PartyRepository;
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
  sourceStatus: Awaited<ReturnType<SourceStatusRepository["findByRuc"]>>;
  userRows: LeadUserWithName[];
  organization: NonNullable<
    Awaited<ReturnType<PartyRepository["findOrganizationById"]>>
  >;
  legalRepresentative: Awaited<
    ReturnType<PartyRepository["findPrimaryLegalRepresentative"]>
  >;
  rateRevisions: Array<{
    revision: RateRevision;
    files: Awaited<ReturnType<RateRevisionFilesQuery["listByRevisionId"]>>;
  }>;
};

export async function loadLeadDetailSections(
  deps: LeadDetailQueryDeps,
  input: { leadId: string; actorUserId: number },
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
    deps.party.findOrganizationById(lead.organizationId),
    deps.party.findPrimaryLegalRepresentative(lead.organizationId),
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
  });
}
