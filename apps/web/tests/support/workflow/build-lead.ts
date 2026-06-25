import type { LeadStage } from "~/contracts/workflow/vocabulary";
import { acceptRateCommand } from "~/server/workflow/lead/commands/accept-rate";
import { proposeRateCommand } from "~/server/workflow/lead/commands/propose-rate";
import { saveDigitalPolicyCommand } from "~/server/workflow/lead/digital-policy/write";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";
import { addVenueAccountsCommand } from "~/server/workflow/lead/venue/add-venue-accounts";
import { createVenueCommand } from "~/server/workflow/lead/venue/create-venue";

import { createDeterministicIdFactory } from "../_core/ids";
import type { TestRuntime } from "../runtime/app";
import { workflowCommandPorts, workflowRepos } from "./deps";
import type { createWorkflowImporter } from "./importer";
import type { ScenarioActor, ScenarioActorKey, ScenarioLeadRef } from "./leads";
import { registerLead } from "./register";
import {
  buildDefaultRuc,
  type LeadCommercialOptions,
  type OrganizationSeedOptions,
} from "./seed";

export type AtStageOptions = {
  key?: string;
  executive?: ScenarioActorKey;
  backOffice?: ScenarioActorKey;
  organization?: OrganizationSeedOptions;
  commercial?: LeadCommercialOptions;
};

export type BuiltLead = ScenarioLeadRef & {
  proposalId: string | null;
  venueIds: string[];
};

type Importer = ReturnType<typeof createWorkflowImporter>["importer"];

const REACHABLE_STAGES = new Set<LeadStage>([
  "QUALIFYING",
  "PRICING",
  "SETUP",
  "FULFILLMENT",
  "LIVE",
]);

export function createLeadBuilder(deps: {
  runtime: TestRuntime;
  resolveActor: (key: ScenarioActorKey) => ScenarioActor;
  importer: Importer;
}) {
  const { runtime, resolveActor, importer } = deps;
  const ids = createDeterministicIdFactory("lead-builder");

  async function readStage(
    leadId: string,
    actor: ScenarioActor,
  ): Promise<LeadStage> {
    const detail = await getLeadDetail(workflowRepos(runtime), {
      actorUserId: actor.userId,
      actorRole: actor.role,
      leadId,
    });
    if (!detail.ok) {
      throw new Error(
        `atStage: cannot read lead detail (${detail.error.code})`,
      );
    }
    return detail.value.lead.stage;
  }

  async function readFirstVenueId(
    leadId: string,
    actor: ScenarioActor,
  ): Promise<string> {
    const detail = await getLeadDetail(workflowRepos(runtime), {
      actorUserId: actor.userId,
      actorRole: actor.role,
      leadId,
    });
    if (!detail.ok) {
      throw new Error(
        `atStage: cannot read lead detail (${detail.error.code})`,
      );
    }
    const venue = detail.value.venues[0];
    if (!venue) {
      throw new Error("atStage(LIVE): createVenue did not produce a venue");
    }
    return venue.id;
  }

  async function assertStage(
    leadId: string,
    actor: ScenarioActor,
    expected: LeadStage,
    hop: string,
  ): Promise<void> {
    const actual = await readStage(leadId, actor);
    if (actual !== expected) {
      throw new Error(
        `atStage(${expected}): ${hop} did not transition lead (now ${actual})`,
      );
    }
  }

  async function atStage(
    stage: LeadStage,
    options: AtStageOptions = {},
  ): Promise<BuiltLead> {
    if (!REACHABLE_STAGES.has(stage)) {
      throw new Error(`atStage: ${stage} is not reachable through commands`);
    }

    const executive = resolveActor(options.executive ?? "execOne");
    const backOffice = resolveActor(options.backOffice ?? "backOne");
    const key = options.key ?? ids.next("lead");
    const orgKey = options.organization?.key ?? `org-${key}`;
    const ruc = options.organization?.ruc ?? buildDefaultRuc(orgKey);
    const legalName = options.organization?.legalName;

    if (legalName !== undefined && legalName !== null) {
      runtime.engine.company(ruc, { legalName, address: null });
    }

    const registered = await registerLead({
      runtime,
      ruc,
      actor: {
        userId: executive.userId,
        role: "executive",
        branchId: executive.branchId,
      },
      giroNegocio: options.organization?.giroNegocio,
      currentProvider: options.commercial?.currentProvider,
      currentDebitRate: options.commercial?.currentDebitRate,
      currentCreditRate: options.commercial?.currentCreditRate,
      gpv: options.commercial?.gpv,
      ticket: options.commercial?.ticket,
      settlementBank: options.commercial?.settlementBank,
      posCount: options.commercial?.posCount,
    });

    const leadRef: ScenarioLeadRef = {
      id: registered.leadId,
      organization: {
        id: registered.snapshot.organizationId,
        ruc: registered.snapshot.organizationRuc,
        legalName: registered.snapshot.organizationLegalName,
      },
    };
    const built: BuiltLead = { ...leadRef, proposalId: null, venueIds: [] };

    await assertStage(built.id, executive, "QUALIFYING", "registerLead");
    if (stage === "QUALIFYING") return built;

    // Production qualification crosses the import boundary, so test setup does too.
    await importer.run({
      actor: options.backOffice ?? "backOne",
      rows: [
        { type: "status", lead: leadRef, status: "DISPONIBLE" },
        { type: "priority", lead: leadRef, priority: "P1" },
      ],
    });
    await assertStage(built.id, executive, "PRICING", "import review");
    if (stage === "PRICING") return built;

    const proposed = await proposeRateCommand(
      {
        actor: backOffice,
        leadId: built.id,
        proposedDebitRate: 2.5,
        proposedCreditRate: 3,
        proposedForeignRate: 3.5,
        fee: 0.5,
        paybackPricing: 12,
        currency: "PEN",
      },
      workflowCommandPorts(runtime),
    );
    if (!proposed.ok) {
      throw new Error(
        `atStage(SETUP): proposeRate failed (${proposed.error.code})`,
      );
    }
    const proposalId = proposed.value.proposalId;
    built.proposalId = proposalId;

    const accepted = await acceptRateCommand(
      {
        actor: executive,
        leadId: built.id,
        proposalId,
      },
      workflowCommandPorts(runtime),
    );
    if (!accepted.ok) {
      throw new Error(
        `atStage(SETUP): acceptRate failed (${accepted.error.code})`,
      );
    }
    await assertStage(built.id, executive, "SETUP", "acceptRate");
    if (stage === "SETUP") return built;

    const policy = await saveDigitalPolicyCommand(
      {
        actor: executive,
        leadId: built.id,
        linkScope: "none",
        linkUrl: null,
        onlineScope: "none",
        onlineUrl: null,
        onlineCollectionMode: null,
      },
      workflowCommandPorts(runtime),
    );
    if (!policy.ok) {
      throw new Error(
        `atStage(LIVE): saveDigitalPolicy failed (${policy.error.code})`,
      );
    }

    const venue = await createVenueCommand(
      {
        actor: executive,
        leadId: built.id,
        tradeName: `Local ${key}`,
        posQuantity: 1,
        address: "Av. Principal 100",
        addressReference: "Primer piso",
        district: "Lima",
        province: "Lima",
        department: "Lima",
      },
      workflowCommandPorts(runtime),
    );
    if (!venue.ok) {
      throw new Error(
        `atStage(LIVE): createVenue failed (${venue.error.code})`,
      );
    }

    // createVenue generates the id internally and returns only { leadId }, so the
    // venue id is read back from the same detail view production consumers use.
    const venueId = await readFirstVenueId(built.id, executive);
    built.venueIds.push(venueId);

    const accounts = await addVenueAccountsCommand(
      {
        actor: executive,
        leadId: built.id,
        venueId,
        solesAccount: {
          currency: "PEN",
          banco: "BCP",
          tipoCuenta: "AHORROS",
          nroCuenta: "19100000000001",
          cci: "00219100000000000001",
          isSettlement: true,
        },
      },
      workflowCommandPorts(runtime),
    );
    if (!accounts.ok) {
      throw new Error(
        `atStage(LIVE): addVenueAccounts failed (${accounts.error.code})`,
      );
    }
    await assertStage(built.id, executive, "LIVE", "addVenueAccounts");
    return built;
  }

  return { atStage };
}
