import type {
  FulfillmentStep,
  LeadPriority,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { Role } from "~/lib/auth/access/rbac";

import { createDeterministicIdFactory } from "../_core/ids";
import { ISOLATED_DB_IDENTITIES } from "../identities/catalog";
import type { TestRuntime } from "../runtime/app";
import {
  seedLeadScenario,
  seedRateProposal,
  seedUser,
  type LeadCommercialOptions,
  type OrganizationSeedOptions,
  type SeededOrganizationRef,
} from "./workflow-seed";

export type TestActorKey = keyof typeof ISOLATED_DB_IDENTITIES;

export type TestActor = {
  userId: number;
  role: Role;
  branchId: number;
};

export type PersistedLead = {
  id: string;
  organization: SeededOrganizationRef;
  proposalId: string | null;
  venueIds: string[];
  fulfillmentOrderId: string | null;
};

type CommonLeadFixture = {
  key?: string;
  executive?: TestActorKey | number;
  organization?: OrganizationSeedOptions;
  commercial?: LeadCommercialOptions;
  status?: LeadStatus | null;
  priority?: LeadPriority | null;
};

export type LeadFixture =
  | (CommonLeadFixture & { kind: "qualifying" })
  | (CommonLeadFixture & {
      kind: "pricing";
      proposal?: "none" | "pending" | "accepted";
    })
  | (CommonLeadFixture & { kind: "setup"; withVenue?: boolean })
  | (CommonLeadFixture & {
      kind: "fulfillment";
      step?: FulfillmentStep;
    })
  | (CommonLeadFixture & { kind: "live" })
  | (CommonLeadFixture & { kind: "closed-lost" });

export function actorBy(key: TestActorKey): TestActor {
  const actor = ISOLATED_DB_IDENTITIES[key];
  return {
    userId: actor.userId,
    role: actor.role,
    branchId: actor.branchId,
  };
}

export function actorWithRole(key: TestActorKey, role: Role): TestActor {
  return { ...actorBy(key), role };
}

export function actorFromUser(input: {
  id: number;
  role: Role;
  branchId: number;
}): TestActor {
  return { userId: input.id, role: input.role, branchId: input.branchId };
}

function stageFor(kind: LeadFixture["kind"]) {
  switch (kind) {
    case "qualifying":
      return "QUALIFYING" as const;
    case "pricing":
      return "PRICING" as const;
    case "setup":
      return "SETUP" as const;
    case "fulfillment":
      return "FULFILLMENT" as const;
    case "live":
      return "LIVE" as const;
    case "closed-lost":
      return "CLOSED_LOST" as const;
    default:
      kind satisfies never;
      throw new Error("Unknown lead fixture kind");
  }
}

export function createLeadFixtureWriter(runtime: TestRuntime) {
  const ids = createDeterministicIdFactory("lead-fixture");

  return async function givenLead(input: LeadFixture): Promise<PersistedLead> {
    const key = input.key ?? ids.next("lead");
    const executiveId =
      typeof input.executive === "number"
        ? input.executive
        : actorBy(input.executive ?? "execOne").userId;
    const organizationKey = input.organization?.key ?? `org-${key}`;
    const seeded = await seedLeadScenario(runtime, {
      organization: {
        key: organizationKey,
        ruc: input.organization?.ruc,
        legalName: input.organization?.legalName,
        giroNegocio: input.organization?.giroNegocio,
      },
      lead: {
        id: `lead-${key}`,
        executiveId,
        stage: stageFor(input.kind),
        status: input.status ?? null,
        priority: input.priority ?? null,
        reservationExpiresAt:
          input.kind === "pricing" && input.proposal !== "none"
            ? runtime.now.get() + 30 * 24 * 60 * 60 * 1000
            : null,
        commercial: input.commercial,
      },
    });

    let proposalId: string | null = null;
    if (input.kind === "pricing" && input.proposal !== "none") {
      proposalId = `proposal-${key}`;
      await seedRateProposal(runtime, {
        id: proposalId,
        leadId: seeded.leadId,
        round: 1,
        proposedDebitRate: 2.5,
        proposedCreditRate: 3,
        proposedForeignRate: 3.5,
        fee: 0.5,
        paybackPricing: 12,
        proposedBy: actorBy("backOne").userId,
        outcome: input.proposal === "accepted" ? "accepted" : "pending",
      });
    }

    const venueIds: string[] = [];
    if (
      input.kind === "fulfillment" ||
      input.kind === "live" ||
      (input.kind === "setup" && input.withVenue)
    ) {
      const venueId = `venue-${key}`;
      venueIds.push(venueId);
      await runtime.ctx.db
        .insertInto("workflow_lead_venues")
        .values({
          id: venueId,
          lead_id: seeded.leadId,
          trade_name: `Local ${key}`,
          pos_quantity: 1,
          link_url: null,
          online_url: null,
          online_collection_mode: null,
          address: "Av. Principal 100",
          address_reference: "Primer piso",
          district: "Lima",
          province: "Lima",
          department: "Lima",
          created_at: runtime.now.get(),
          created_by: executiveId,
        })
        .execute();
    }

    let fulfillmentOrderId: string | null = null;
    if (input.kind === "fulfillment" || input.kind === "live") {
      fulfillmentOrderId = `fulfillment-${key}`;
      await runtime.ctx.db
        .insertInto("lead_fulfillment_orders")
        .values({
          id: fulfillmentOrderId,
          lead_id: seeded.leadId,
          product_kind: null,
          current_step:
            input.kind === "fulfillment"
              ? (input.step ?? "CHOOSE_PRODUCT")
              : "COMPLETED",
          service_b_ref: null,
          created_by: executiveId,
          created_at: runtime.now.get(),
          updated_at: runtime.now.get(),
        })
        .execute();
    }

    return {
      id: seeded.leadId,
      organization: seeded.organization,
      proposalId,
      venueIds,
      fulfillmentOrderId,
    };
  };
}

export function createUserFixtureWriter(runtime: TestRuntime) {
  let generatedUserId = 100;

  async function create(input: {
    role: "admin" | "executive";
    branchId?: number;
  }): Promise<{ id: number }> {
    const id = ++generatedUserId;
    await seedUser(runtime, {
      id,
      username: `${input.role}.${id}`,
      email: `${input.role}.${id}@test.local`,
      names: input.role === "admin" ? "Admin" : "Executive",
      firstSurname: "Test",
      secondSurname: "User",
      role: input.role,
      branchId: input.branchId,
    });
    return { id };
  }

  return {
    admin: (input: { branchId?: number } = {}) =>
      create({ role: "admin", ...input }),
    executive: (input: { branchId?: number } = {}) =>
      create({ role: "executive", ...input }),
  };
}
