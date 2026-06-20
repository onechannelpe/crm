import type { QueueDoorbell } from "~/lib/job-queue/doorbell";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { addLeadNote, logLeadCall } from "~/server/workflow/interaction/write";
import { acceptRateCommand } from "~/server/workflow/lead/write/accept-rate";
import { addToFavoritesCommand } from "~/server/workflow/lead/write/add-to-favorites";
import { addVenueAccountsCommand } from "~/server/workflow/lead/write/add-venue-accounts";
import { createVenueCommand } from "~/server/workflow/lead/write/create-venue";
import { deleteLeadCommand } from "~/server/workflow/lead/write/delete-lead";
import { editCommercialScopeCommand } from "~/server/workflow/lead/write/edit-commercial-scope";
import { editRateProposalCommand } from "~/server/workflow/lead/write/edit-rate-proposal";
import { proposeRateCommand } from "~/server/workflow/lead/write/propose-rate";
import { reassignLeadCommand } from "~/server/workflow/lead/write/reassign-lead";
import { recordRepLegalCommand } from "~/server/workflow/lead/write/record-rep-legal";
import { registerLead } from "~/server/workflow/lead/write/register-lead";
import { removeFromFavoritesCommand } from "~/server/workflow/lead/write/remove-from-favorites";
import { requestRateRevisionCommand } from "~/server/workflow/lead/write/request-rate-revision";
import { requestSunatRefresh } from "~/server/workflow/lead/write/request-sunat-refresh";
import { saveDigitalPolicyCommand } from "~/server/workflow/lead/write/save-digital-policy";
import { updateVenueCommand } from "~/server/workflow/lead/write/update-venue";
import { updateRateProposalPolicy } from "~/server/workflow/policy/write/update-rate-proposal-policy";
import { updateSourcingPolicy } from "~/server/workflow/policy/write/update-sourcing-policy";
import type {
  AcceptRateCommandInput,
  AddLeadNoteCommandInput,
  AddVenueAccountsCommandInput,
  CreateVenueCommandInput,
  EditCommercialScopeCommandInput,
  EditRateProposalCommandInput,
  LogLeadCallCommandInput,
  ProposeRateCommandInput,
  ReassignLeadCommandInput,
  RecordRepLegalCommandInput,
  RegisterLeadCommandInput,
  RequestRateRevisionCommandInput,
  SaveDigitalPolicyCommandInput,
  UpdateRateProposalPolicyCommandInput,
  UpdateSourcingPolicyCommandInput,
  UpdateVenueCommandInput,
} from "~/server/workflow/types";
import type { WorkflowActor } from "~/server/workflow/types";

import type { WorkflowEngineGateway } from "./infrastructure/ports/gateways";
import type { WorkflowRepos } from "./infrastructure/workflow-repos";

export function createWorkflowCommandBus(
  executor: DatabaseExecutor,
  repos: WorkflowRepos,
  engineGateway: WorkflowEngineGateway,
  doorbell: QueueDoorbell,
  now: () => number,
) {
  const enrichmentCommand = createEnrichmentCommand(
    createSearchEnrichmentRepo(executor),
    doorbell,
  );
  const enrichmentQueue = {
    async enqueueRucVerification(
      ruc: string,
      requestedByUserId: number,
    ): Promise<void> {
      await enrichmentCommand.enqueueRequest("ruc", ruc, requestedByUserId);
    },
  };

  return {
    registerLead: (input: RegisterLeadCommandInput) =>
      registerLead(
        {
          actorUserId: input.actor.userId,
          actorRole: input.actor.role,
          ruc: input.ruc,
          currentProvider: input.currentProvider,
          currentDebitRate: input.currentDebitRate,
          currentCreditRate: input.currentCreditRate,
          gpv: input.gpv,
          ticket: input.ticket,
          giroNegocio: input.giroNegocio,
          settlementBank: input.settlementBank,
          posCount: input.posCount,
        },
        {
          leads: repos.leads,
          users: repos.users,
          engineGateway,
          enrichmentQueue,
          executor,
          now: now(),
        },
      ),

    reassignLead: (input: ReassignLeadCommandInput) =>
      reassignLeadCommand(input, { executor, now: now() }),

    addLeadNote: (input: AddLeadNoteCommandInput) =>
      addLeadNote(input, { executor, now: now() }),

    logLeadCall: (input: LogLeadCallCommandInput) =>
      logLeadCall(input, { executor, now: now() }),

    acceptRate: (input: AcceptRateCommandInput) =>
      acceptRateCommand(input, { executor, now: now() }),

    proposeRate: (input: ProposeRateCommandInput) =>
      proposeRateCommand(input, { executor, now: now() }),

    editRateProposal: (input: EditRateProposalCommandInput) =>
      editRateProposalCommand(input, { executor, now: now() }),

    editCommercialScope: (input: EditCommercialScopeCommandInput) =>
      editCommercialScopeCommand(input, { executor, now: now() }),

    saveDigitalPolicy: (input: SaveDigitalPolicyCommandInput) =>
      saveDigitalPolicyCommand(input, { executor, now: now() }),

    recordRepLegal: (input: RecordRepLegalCommandInput) =>
      recordRepLegalCommand(input, { executor, now: now() }),

    createVenue: (input: CreateVenueCommandInput) =>
      createVenueCommand(input, { executor, now: now() }),

    updateVenue: (input: UpdateVenueCommandInput) =>
      updateVenueCommand(input, { executor, now: now() }),

    addVenueAccounts: (input: AddVenueAccountsCommandInput) =>
      addVenueAccountsCommand(input, { executor, now: now() }),

    requestRateRevision: (input: RequestRateRevisionCommandInput) =>
      requestRateRevisionCommand(input, { executor, now: now() }),

    requestSunatRefresh: (input: { actor: WorkflowActor; leadId: string }) =>
      requestSunatRefresh(input, {
        leads: repos.leads,
        enrichmentQueue,
      }),

    addToFavorites: (input: { actor: WorkflowActor; leadId: string }) =>
      addToFavoritesCommand(input, { executor, now: now() }),

    removeFromFavorites: (input: { actor: WorkflowActor; leadId: string }) =>
      removeFromFavoritesCommand(input, { executor, now: now() }),

    deleteLead: (input: { actor: WorkflowActor; leadId: string }) =>
      deleteLeadCommand(input, { executor, now: now() }),

    updateSourcingPolicy: (input: UpdateSourcingPolicyCommandInput) =>
      updateSourcingPolicy(input, {
        sourcingPolicies: repos.sourcingPolicies,
        now: now(),
      }),

    updateRateProposalPolicy: (input: UpdateRateProposalPolicyCommandInput) =>
      updateRateProposalPolicy(input, {
        rateProposalPolicies: repos.rateProposalPolicies,
        now: now(),
      }),
  };
}
