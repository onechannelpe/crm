import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { acceptRateCommand } from "~/server/workflow/application/commands/accept-rate";
import { addLeadNoteCommand } from "~/server/workflow/application/commands/add-note";
import { addToFavoritesCommand } from "~/server/workflow/application/commands/add-to-favorites";
import { addVenueAccountsCommand } from "~/server/workflow/application/commands/add-venue-accounts";
import { createVenueCommand } from "~/server/workflow/application/commands/create-venue";
import { editCommercialScopeCommand } from "~/server/workflow/application/commands/edit-commercial-scope";
import { logLeadCallCommand } from "~/server/workflow/application/commands/log-call";
import { proposeRateCommand } from "~/server/workflow/application/commands/propose-rate";
import { reassignLeadCommand } from "~/server/workflow/application/commands/reassign-lead";
import { recordRepLegalCommand } from "~/server/workflow/application/commands/record-rep-legal";
import { registerLead } from "~/server/workflow/application/commands/register-lead";
import { removeFromFavoritesCommand } from "~/server/workflow/application/commands/remove-from-favorites";
import { requestRateRevisionCommand } from "~/server/workflow/application/commands/request-rate-revision";
import { requestSunatRefresh } from "~/server/workflow/application/commands/request-sunat-refresh";
import { saveDigitalPolicyCommand } from "~/server/workflow/application/commands/save-digital-policy";
import { updateSourcingPolicy } from "~/server/workflow/application/commands/update-sourcing-policy";
import { updateVenueCommand } from "~/server/workflow/application/commands/update-venue";
import type { LeadEnrichmentQueue } from "~/server/workflow/application/ports/gateways";
import { createLeadStateRepo } from "~/server/workflow/infrastructure/lead-state-repo";
import { createWorkflowRepos } from "~/server/workflow/infrastructure/workflow-repos";
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
  WorkflowActor,
} from "~/server/workflow/types";

import type { TestRuntime } from "../runtime/app";

const NO_OP_ENRICHMENT_QUEUE: LeadEnrichmentQueue = {
  enqueueRucVerification: async () => {},
};

export type TestCommandOverrides = {
  leadEnrichmentQueue?: LeadEnrichmentQueue;
};

function buildCommandApi(
  executor: DatabaseExecutor,
  overrides?: TestCommandOverrides,
) {
  const repos = createWorkflowRepos(executor);
  const leadStates = createLeadStateRepo(executor);
  const enrichmentQueue =
    overrides?.leadEnrichmentQueue ?? NO_OP_ENRICHMENT_QUEUE;

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

    addToFavorites: (input: { actor: WorkflowActor; leadId: string }) =>
      addToFavoritesCommand(input, { executor }),

    removeFromFavorites: (input: { actor: WorkflowActor; leadId: string }) =>
      removeFromFavoritesCommand(input, { executor }),

    reassignLead: (input: ReassignLeadCommandInput) =>
      reassignLeadCommand(input, { executor }),

    addLeadNote: (input: AddLeadNoteCommandInput) =>
      addLeadNoteCommand(input, { executor }),

    logLeadCall: (input: LogLeadCallCommandInput) =>
      logLeadCallCommand(input, { executor }),

    acceptRate: (input: AcceptRateCommandInput) =>
      acceptRateCommand(input, { executor }),

    proposeRate: (input: ProposeRateCommandInput) =>
      proposeRateCommand(input, { executor }),

    editCommercialScope: (input: EditCommercialScopeCommandInput) =>
      editCommercialScopeCommand(input, { executor }),

    saveDigitalPolicy: (input: SaveDigitalPolicyCommandInput) =>
      saveDigitalPolicyCommand(input, { executor }),

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

    updateSourcingPolicy: (input: UpdateSourcingPolicyCommandInput) =>
      updateSourcingPolicy(input, {
        sourcingPolicies: repos.sourcingPolicies,
      }),
  };
}

export function runTestWorkflowCommand<T>(
  runtime: TestRuntime,
  operation: (commandApi: ReturnType<typeof buildCommandApi>) => Promise<T>,
  overrides?: TestCommandOverrides,
): Promise<T> {
  return operation(buildCommandApi(runtime.ctx.db, overrides));
}
