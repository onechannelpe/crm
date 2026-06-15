import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  AcceptRateCommandInput,
  AddLeadNoteCommandInput,
  AddVenueAccountsCommandInput,
  CreateVenueCommandInput,
  EditCommercialScopeCommandInput,
  LogLeadCallCommandInput,
  ProposeRateCommandInput,
  ReassignLeadCommandInput,
  RecordRepLegalCommandInput,
  RegisterLeadCommandInput,
  RequestRateRevisionCommandInput,
  SaveDigitalPolicyCommandInput,
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
import { logLeadCallCommand } from "./commands/log-call";
import { proposeRateCommand } from "./commands/propose-rate";
import { reassignLeadCommand } from "./commands/reassign-lead";
import { recordRepLegalCommand } from "./commands/record-rep-legal";
import { registerLead } from "./commands/register-lead";
import { removeFromFavoritesCommand } from "./commands/remove-from-favorites";
import { requestRateRevisionCommand } from "./commands/request-rate-revision";
import { requestSunatRefresh } from "./commands/request-sunat-refresh";
import { saveDigitalPolicyCommand } from "./commands/save-digital-policy";
import { updateSourcingPolicy } from "./commands/update-sourcing-policy";
import { updateVenueCommand } from "./commands/update-venue";

export function createWorkflowCommandBus(
  executor: DatabaseExecutor,
  repos: WorkflowRepos,
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
          razonSocial: input.razonSocial,
          address: input.address,
          proveedorActual: input.proveedorActual,
          tasaActual: input.tasaActual,
          gpv: input.gpv,
          ticket: input.ticket,
          giroNegocio: input.giroNegocio,
          abonoBank: input.abonoBank,
          posTotal: input.posTotal,
        },
        {
          leads: repos.leads,
          leadStates,
          users: repos.users,
          enrichmentQueue,
          executor,
        },
      ),

    reassignLead: (input: ReassignLeadCommandInput) =>
      reassignLeadCommand(input, { executor }),

    addLeadNote: (input: AddLeadNoteCommandInput) =>
      addLeadNoteCommand(input, { executor }),

    logLeadCall: (input: LogLeadCallCommandInput) =>
      logLeadCallCommand(input, { executor }),

    acceptRate: (input: AcceptRateCommandInput) =>
      acceptRateCommand(input, { executor }),

    proposeRate: (input: ProposeRateCommandInput) =>
      proposeRateCommand(input, {
        executor,
      }),

    editCommercialScope: (input: EditCommercialScopeCommandInput) =>
      editCommercialScopeCommand(input, {
        executor,
      }),

    saveDigitalPolicy: (input: SaveDigitalPolicyCommandInput) =>
      saveDigitalPolicyCommand(input, {
        executor,
      }),

    recordRepLegal: (input: RecordRepLegalCommandInput) =>
      recordRepLegalCommand(input, {
        executor,
      }),

    createVenue: (input: CreateVenueCommandInput) =>
      createVenueCommand(input, {
        executor,
      }),

    updateVenue: (input: UpdateVenueCommandInput) =>
      updateVenueCommand(input, {
        executor,
      }),

    addVenueAccounts: (input: AddVenueAccountsCommandInput) =>
      addVenueAccountsCommand(input, {
        executor,
      }),

    requestRateRevision: (input: RequestRateRevisionCommandInput) =>
      requestRateRevisionCommand(input, { executor }),

    requestSunatRefresh: (input: { actor: WorkflowActor; leadId: string }) =>
      requestSunatRefresh(input, {
        leads: repos.leads,
        enrichmentQueue,
      }),

    addToFavorites: (input: { actor: WorkflowActor; leadId: string }) =>
      addToFavoritesCommand(input, { executor }),

    removeFromFavorites: (input: { actor: WorkflowActor; leadId: string }) =>
      removeFromFavoritesCommand(input, { executor }),

    deleteLead: (input: { actor: WorkflowActor; leadId: string }) =>
      deleteLeadCommand(input, { executor }),

    updateSourcingPolicy: (input: UpdateSourcingPolicyCommandInput) =>
      updateSourcingPolicy(input, { sourcingPolicies: repos.sourcingPolicies }),
  };
}
