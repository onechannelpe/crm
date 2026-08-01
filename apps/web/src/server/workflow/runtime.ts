import "server-only";
import { createCompanyRegistryRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import type { FileRepos } from "~/server/files/service/contracts";
import type { FileStorage } from "~/server/files/storage";
import type { EngineClient } from "~/server/integrations/engine/client";
import { createOrganizationEnrichment } from "~/server/organization/enrichment";
import type { OrganizationEnrichmentQueue } from "~/server/organization/enrichment";
import type { ServerInfrastructure } from "~/server/platform/composition/infrastructure";
import { createInquiry } from "~/server/workflow/inquiry/create-inquiry";
import { listInquiriesForExecutive } from "~/server/workflow/inquiry/inquiry-queries";
import { acceptRateCommand } from "~/server/workflow/lead/commands/accept-rate";
import { addToFavoritesCommand } from "~/server/workflow/lead/commands/add-to-favorites";
import { closeLeadCommand } from "~/server/workflow/lead/commands/close-lead";
import { deleteLeadCommand } from "~/server/workflow/lead/commands/delete-lead";
import { editCommercialScopeCommand } from "~/server/workflow/lead/commands/edit-commercial-scope";
import { editRateProposalCommand } from "~/server/workflow/lead/commands/edit-rate-proposal";
import { proposeRateCommand } from "~/server/workflow/lead/commands/propose-rate";
import { reassignLeadCommand } from "~/server/workflow/lead/commands/reassign-lead";
import { recordRepLegalCommand } from "~/server/workflow/lead/commands/record-rep-legal";
import { registerLead } from "~/server/workflow/lead/commands/register-lead";
import { removeFromFavoritesCommand } from "~/server/workflow/lead/commands/remove-from-favorites";
import { requestRateRevisionCommand } from "~/server/workflow/lead/commands/request-rate-revision";
import { requestSunatRefresh } from "~/server/workflow/lead/commands/request-sunat-refresh";
import { restartQuotationCommand } from "~/server/workflow/lead/commands/restart-quotation";
import { reviewLeadCommand } from "~/server/workflow/lead/commands/review-lead";
import { saveDigitalPolicyCommand } from "~/server/workflow/lead/digital-policy/write";
import { resolvePendingQuotationPolicy } from "~/server/workflow/lead/domain/pending-quotation";
import { createLeadFilesService } from "~/server/workflow/lead/files/lead-files";
import {
  chooseFulfillmentProductCommand,
  recordUnitSerialCommand,
  registerUnitPaymentLinkCommand,
  registerUnitSaleCommand,
  rejectFulfillmentStepCommand,
  validateFulfillmentPaymentCommand,
} from "~/server/workflow/lead/fulfillment/commands";
import { addLeadNote } from "~/server/workflow/lead/interaction/write";
import { getLeadBootstrapPreview } from "~/server/workflow/lead/read/queries/get-lead-bootstrap-preview";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";
import { listAssignableExecutives } from "~/server/workflow/lead/read/queries/list-assignable-executives";
import { listFulfillmentQueue } from "~/server/workflow/lead/read/queries/list-fulfillment-queue";
import { listLeads } from "~/server/workflow/lead/read/queries/list-leads";
import { addVenueAccountsCommand } from "~/server/workflow/lead/venue/add-venue-accounts";
import { createVenueCommand } from "~/server/workflow/lead/venue/create-venue";
import { updateVenueCommand } from "~/server/workflow/lead/venue/update-venue";
import { createLeadRepo } from "~/server/workflow/lead/write/lead-repo";
import { getPendingQuotationPolicy } from "~/server/workflow/policy/read/get-pending-quotation-policy";
import { getRateProposalPolicy } from "~/server/workflow/policy/read/get-rate-proposal-policy";
import { getSourcingPolicy } from "~/server/workflow/policy/read/get-sourcing-policy";
import { updatePendingQuotationPolicy } from "~/server/workflow/policy/write/update-pending-quotation-policy";
import { updateRateProposalPolicy } from "~/server/workflow/policy/write/update-rate-proposal-policy";
import { updateSourcingPolicy } from "~/server/workflow/policy/write/update-sourcing-policy";
import { createWorkflowRepos } from "~/server/workflow/repos";
import type { WorkflowWriteContext } from "~/server/workflow/types";

function bindWorkflowCommand<TInput, TOutput>(
  executor: ServerInfrastructure["db"],
  command: (input: TInput, scope: WorkflowWriteContext) => TOutput,
) {
  return (input: TInput, operationAt: Date): TOutput =>
    command(input, { executor, operationAt });
}

export function createWorkflowRuntime(
  serverInfrastructure: ServerInfrastructure,
  engine: EngineClient,
  files: { repo: FileRepos; storage: FileStorage },
) {
  const organizationEnrichment = createOrganizationEnrichment(engine);
  const repos = createWorkflowRepos(serverInfrastructure.db);
  const leadRepo = createLeadRepo(serverInfrastructure.db);

  const enrichmentCommand = createEnrichmentCommand(
    createCompanyRegistryRepo(serverInfrastructure.db),
  );

  const enrichmentQueue: OrganizationEnrichmentQueue = {
    enqueueRucVerification: async (
      ruc,
      requestedByUserId,
      now,
    ): Promise<void> => {
      await enrichmentCommand.enqueueRequest(
        { kind: "ruc", value: ruc },
        requestedByUserId,
        now,
      );
    },
  };

  const command = <TInput, TOutput>(
    handler: (input: TInput, scope: WorkflowWriteContext) => TOutput,
  ) => bindWorkflowCommand(serverInfrastructure.db, handler);

  const filesService = createLeadFilesService({
    leadReader: leadRepo,
    leadQueries: repos.leadQueries,
    fulfillment: repos.fulfillment,
    filesRepo: files.repo,
    filesStorage: files.storage,
    executor: serverInfrastructure.db,
  });

  return {
    commands: {
      addLeadNote: command(addLeadNote),
      addToFavorites: command(addToFavoritesCommand),
      addVenueAccounts: command(addVenueAccountsCommand),
      acceptRate: command(acceptRateCommand),
      chooseFulfillmentProduct: command(chooseFulfillmentProductCommand),
      closeLead: command(closeLeadCommand),
      createInquiry: command(createInquiry),
      createVenue: command(createVenueCommand),
      deleteLead: command(deleteLeadCommand),
      editCommercialScope: command(editCommercialScopeCommand),
      editRateProposal: command(editRateProposalCommand),
      proposeRate: command(proposeRateCommand),
      reassignLead: command(reassignLeadCommand),
      recordFulfillmentSerial: command(recordUnitSerialCommand),
      recordRepLegal: command(recordRepLegalCommand),
      registerFulfillmentPaymentLink: command(registerUnitPaymentLinkCommand),
      registerFulfillmentSale: command(registerUnitSaleCommand),
      registerLead: (
        input: Parameters<typeof registerLead>[0],
        operationAt: Date,
      ) =>
        registerLead(
          input,
          { executor: serverInfrastructure.db, operationAt },
          {
            identity: organizationEnrichment,
          },
        ),
      rejectFulfillmentStep: command(rejectFulfillmentStepCommand),
      removeFromFavorites: command(removeFromFavoritesCommand),
      requestRateRevision: command(requestRateRevisionCommand),
      requestSunatRefresh: (
        input: Parameters<typeof requestSunatRefresh>[0],
        operationAt: Date,
      ) =>
        requestSunatRefresh(input, {
          leads: repos.leads,
          enrichmentQueue,
          now: operationAt,
        }),
      restartQuotation: command(restartQuotationCommand),
      reviewLead: command(reviewLeadCommand),
      saveDigitalPolicy: command(saveDigitalPolicyCommand),
      updatePendingQuotationPolicy: (
        input: Parameters<typeof updatePendingQuotationPolicy>[0],
        operationAt: Date,
      ) =>
        updatePendingQuotationPolicy(
          input,
          repos.pendingQuotationPolicies,
          operationAt,
        ),
      updateRateProposalPolicy: (
        input: Parameters<typeof updateRateProposalPolicy>[0],
        operationAt: Date,
      ) =>
        updateRateProposalPolicy(
          input,
          repos.rateProposalPolicies,
          operationAt,
        ),
      updateSourcingPolicy: (
        input: Parameters<typeof updateSourcingPolicy>[0],
        operationAt: Date,
      ) => updateSourcingPolicy(input, repos.sourcingPolicies, operationAt),
      updateVenue: command(updateVenueCommand),
      validateFulfillmentPayment: command(validateFulfillmentPaymentCommand),
    },
    files: filesService,
    queries: {
      getLeadBootstrapPreview: (
        input: Parameters<typeof getLeadBootstrapPreview>[2],
      ) =>
        getLeadBootstrapPreview(
          { organization: repos.organization },
          organizationEnrichment,
          input,
        ),
      getLeadDetail: (input: Parameters<typeof getLeadDetail>[1]) =>
        getLeadDetail(repos, input),
      getPendingQuotationPolicy: (
        input: Parameters<typeof getPendingQuotationPolicy>[1],
      ) =>
        getPendingQuotationPolicy(
          { pendingQuotationPolicies: repos.pendingQuotationPolicies },
          input,
        ),
      getRateProposalPolicy: (
        input: Parameters<typeof getRateProposalPolicy>[1],
      ) =>
        getRateProposalPolicy(
          { rateProposalPolicies: repos.rateProposalPolicies },
          input,
        ),
      getSourcingPolicy: (input: Parameters<typeof getSourcingPolicy>[1]) =>
        getSourcingPolicy({ sourcingPolicies: repos.sourcingPolicies }, input),
      listAssignableExecutives: (
        input: Parameters<typeof listAssignableExecutives>[1],
      ) => listAssignableExecutives(repos, input),
      listFulfillmentQueue: (
        input: Parameters<typeof listFulfillmentQueue>[1],
      ) => listFulfillmentQueue(serverInfrastructure.db, input),
      listInquiriesForExecutive: (
        userId: Parameters<typeof listInquiriesForExecutive>[1],
      ) => listInquiriesForExecutive(serverInfrastructure.db, userId),
      listLeads: (input: Parameters<typeof listLeads>[1]) =>
        listLeads({ leads: repos.leadQueries }, input),
      pendingQuotationCount: async (
        userId: Parameters<
          typeof repos.leads.countPendingQuotationDecisions
        >[0],
        branchId: Parameters<
          typeof repos.pendingQuotationPolicies.findByBranchId
        >[0],
        evaluatedAt: Date,
      ) => {
        const [count, branchPolicy] = await Promise.all([
          repos.leads.countPendingQuotationDecisions(userId, evaluatedAt),
          repos.pendingQuotationPolicies.findByBranchId(branchId),
        ]);
        const { limit } = resolvePendingQuotationPolicy({ branchPolicy });
        return { count, limit };
      },
    },
  };
}
