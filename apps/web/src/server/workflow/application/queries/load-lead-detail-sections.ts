import { createLogger } from "~/lib/observability/logger";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadHistoryEntry } from "../../domain/history";
import type { LeadState } from "../../domain/lead/state";
import type {
  LeadProfileRepository,
  LeadNegotiationRequest,
  NegotiationRequestRepository,
  PartyRepository,
  LeadQuotation,
  LeadQuotationRepository,
  LeadVenue,
  LeadVenueRepository,
  SourceStatusRepository,
  LeadUserWithName,
  WorkflowUserRepository,
} from "../ports/entities";
import type {
  LeadHistoryRepository,
  LeadFavoriteRepository,
  LeadRepository,
} from "../ports/lead";

const logger = createLogger("workflow-get-lead-detail");

function isRecoverableSectionError(error: DomainError): boolean {
  return error.kind === "external";
}

function reportSectionDegradation(section: string, error: DomainError): void {
  logger.error("workflow_lead_detail_degraded_section", {
    section,
    domainKind: error.kind,
    domainCode: error.code,
    domainMessage: error.message,
    domainDetails: error.details,
  });
}

export type NegotiationFilesQuery = {
  listByNegotiationRequestId(requestId: string): Promise<
    Array<{
      artifactId: string;
      negotiationRequestId: string;
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
  leadProfiles: LeadProfileRepository;
  leadHistory: LeadHistoryRepository;
  leadQuotations: LeadQuotationRepository;
  leadVenues: LeadVenueRepository;
  leadNegotiationRequests: NegotiationRequestRepository;
  negotiationFiles: NegotiationFilesQuery;
  sourceStatuses: SourceStatusRepository;
  users: WorkflowUserRepository;
  party: PartyRepository;
};

export type LeadDetailLoadedSections = {
  lead: LeadState;
  isFavorite: boolean;
  profile: Awaited<ReturnType<LeadProfileRepository["findByLeadId"]>>;
  quotations: LeadQuotation[];
  venues: LeadVenue[];
  negotiationRequestRows: LeadNegotiationRequest[];
  history: LeadHistoryEntry[];
  sourceStatus: Awaited<ReturnType<SourceStatusRepository["findByRuc"]>>;
  userRows: LeadUserWithName[];
  organization: NonNullable<
    Awaited<ReturnType<PartyRepository["findOrganizationById"]>>
  >;
  legalRepresentative: Awaited<
    ReturnType<PartyRepository["findPrimaryLegalRepresentative"]>
  >;
  negotiationRequests: Array<{
    request: LeadNegotiationRequest;
    files: Awaited<
      ReturnType<NegotiationFilesQuery["listByNegotiationRequestId"]>
    >;
  }>;
};

export async function loadLeadDetailSections(
  deps: LeadDetailQueryDeps,
  input: { leadId: string; actorUserId: number },
): Promise<Result<LeadDetailLoadedSections, DomainError>> {
  const lead = await deps.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  const [
    isFavorite,
    profile,
    quotations,
    venuesResult,
    negotiationRequestRows,
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
    deps.leadProfiles.findByLeadId(input.leadId),
    deps.leadQuotations.listByLeadId(input.leadId),
    deps.leadVenues.listByLeadId(input.leadId),
    deps.leadNegotiationRequests.listByLeadId(input.leadId),
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
      domainError(
        "not_found",
        "lead_organization_not_found",
        "Lead organization not found",
        {
          leadId: lead.id,
          organizationId: lead.organizationId,
        },
      ),
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

  const negotiationRequests = await Promise.all(
    negotiationRequestRows.map(async (req) => ({
      request: req,
      files: await deps.negotiationFiles.listByNegotiationRequestId(req.id),
    })),
  );

  return Ok({
    lead,
    isFavorite,
    profile,
    quotations,
    venues,
    negotiationRequestRows,
    history,
    sourceStatus,
    userRows,
    organization,
    legalRepresentative,
    negotiationRequests,
  });
}
