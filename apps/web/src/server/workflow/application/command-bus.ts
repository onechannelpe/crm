import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
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

import { createLeadStateRepo } from "../infrastructure/lead-state-repo";
import type { WorkflowRepos } from "../infrastructure/workflow-repos";
import { acceptRateCommand } from "./commands/accept-rate";
import { addLeadNoteCommand } from "./commands/add-note";
import { addToFavoritesCommand } from "./commands/add-to-favorites";
import { addVenueAccountsCommand } from "./commands/add-venue-accounts";
import { createVenueCommand } from "./commands/create-venue";
import { deleteLeadCommand } from "./commands/delete-lead";
import { editCommercialScopeCommand } from "./commands/edit-commercial-scope";
import { editRateProposalCommand } from "./commands/edit-rate-proposal";
import { logLeadCallCommand } from "./commands/log-call";
import { proposeRateCommand } from "./commands/propose-rate";
import { reassignLeadCommand } from "./commands/reassign-lead";
import { recordRepLegalCommand } from "./commands/record-rep-legal";
import { registerLead } from "./commands/register-lead";
import { removeFromFavoritesCommand } from "./commands/remove-from-favorites";
import { requestRateRevisionCommand } from "./commands/request-rate-revision";
import { requestSunatRefresh } from "./commands/request-sunat-refresh";
import { saveDigitalPolicyCommand } from "./commands/save-digital-policy";
import { updateRateProposalPolicy } from "./commands/update-rate-proposal-policy";
import { updateSourcingPolicy } from "./commands/update-sourcing-policy";
import { updateVenueCommand } from "./commands/update-venue";
import type { WorkflowEngineGateway } from "./ports/gateways";

export function createWorkflowCommandBus(
  executor: DatabaseExecutor,
  repos: WorkflowRepos,
  engineGateway: WorkflowEngineGateway,
  now: () => number,
) {
  const leadStates = createLeadStateRepo(executor);

  const enrichmentCommand = createEnrichmentCommand(
    createSearchEnrichmentRepo(executor),
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
          leadStates,
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
      addLeadNoteCommand(input, { executor, now: now() }),

    logLeadCall: (input: LogLeadCallCommandInput) =>
      logLeadCallCommand(input, { executor, now: now() }),

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
      removeFromFavoritesCommand(input, { executor }),

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
