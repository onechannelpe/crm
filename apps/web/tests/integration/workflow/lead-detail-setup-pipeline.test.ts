import { expectOk } from "@tests/support/_core/assertions";
import {
  actorBy,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import {
  workflowCommandPorts,
  workflowRepos,
} from "@tests/support/integration/workflow-ports";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { asWorkflowVenueId } from "~/server/shared/ids";
import { saveDigitalPolicyCommand } from "~/server/workflow/lead/digital-policy/write";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";
import { addVenueAccountsCommand } from "~/server/workflow/lead/venue/add-venue-accounts";
import { createVenueCommand } from "~/server/workflow/lead/venue/create-venue";

describe("lead detail setup pipeline", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-lead-detail-setup-pipeline");
    runtime.now.set(new Date(1_000));
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("composes profile from lead commercial scope, organization, and optional digital policy", async () => {
    const actor = actorBy("execOne");
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "setup",
      key: "detail-profile",
      organization: {
        key: "detail-profile",
        legalName: "Acme SAC",
        giroNegocio: "Retail",
      },
      commercial: {
        currentProvider: "Izipay",
        currentDebitRate: 2.9,
        currentCreditRate: 3.4,
        gpv: 80_000,
        ticket: 150,
        settlementBank: "BCP",
        posCount: 4,
      },
    });

    const initialDetail = expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId: lead.id,
      }),
    );
    expect(initialDetail.lead).toMatchObject({
      ruc: lead.organization.ruc,
      legalName: "Acme SAC",
    });
    expect(initialDetail.profile).toMatchObject({
      currentProvider: "Izipay",
      currentDebitRate: 2.9,
      currentCreditRate: 3.4,
      gpv: 80_000,
      ticket: 150,
      giroNegocio: "Retail",
      settlementBank: "BCP",
      posCount: 4,
      linkScope: "none",
      linkUrl: null,
      onlineScope: "none",
      onlineUrl: null,
      onlineCollectionMode: null,
    });
    expect(initialDetail.blockingFields).toEqual(["digitalPolicy"]);

    const policyResult = await saveDigitalPolicyCommand(
      {
        actor,
        leadId: lead.id,
        linkScope: "per_venue",
        linkUrl: null,
        onlineScope: "per_venue",
        onlineUrl: null,
        onlineCollectionMode: null,
      },
      workflowCommandPorts(runtime),
    );
    expectOk(policyResult);

    const afterPolicy = expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId: lead.id,
      }),
    );
    expect(afterPolicy.profile).toMatchObject({
      linkScope: "per_venue",
      linkUrl: null,
      onlineScope: "per_venue",
      onlineUrl: null,
      onlineCollectionMode: null,
    });
    expect(afterPolicy.blockingFields).toEqual(["venueAccounts"]);
  });

  it("persists per-venue digital configuration and clears setup blockers when venue accounts are complete", async () => {
    const actor = actorBy("execOne");
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "setup",
      key: "detail-venue-digital",
      organization: { key: "detail-venue-digital" },
    });

    expectOk(
      await saveDigitalPolicyCommand(
        {
          actor,
          leadId: lead.id,
          linkScope: "per_venue",
          linkUrl: null,
          onlineScope: "per_venue",
          onlineUrl: null,
          onlineCollectionMode: null,
        },
        workflowCommandPorts(runtime),
      ),
    );

    expectOk(
      await createVenueCommand(
        {
          actor,
          leadId: lead.id,
          tradeName: "Local Miraflores",
          posQuantity: 2,
          digitalConfig: {
            linkUrl: "https://pay.example/local-miraflores",
            onlineUrl: "https://shop.example/local-miraflores",
            onlineCollectionMode: "ONE_CLIC",
          },
          address: "Av. Nueva 123",
          addressReference: "Frente al parque",
          district: "Miraflores",
          province: "Lima",
          department: "Lima",
        },
        workflowCommandPorts(runtime),
      ),
    );

    const withVenue = expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId: lead.id,
      }),
    );
    expect(withVenue.venues).toHaveLength(1);
    expect(withVenue.venues[0]).toMatchObject({
      tradeName: "Local Miraflores",
      linkUrl: "https://pay.example/local-miraflores",
      onlineUrl: "https://shop.example/local-miraflores",
      onlineCollectionMode: "ONE_CLIC",
    });
    expect(withVenue.blockingFields).toEqual(["venueAccounts"]);

    expectOk(
      await addVenueAccountsCommand(
        {
          actor,
          leadId: lead.id,
          venueId: asWorkflowVenueId(withVenue.venues[0].id),
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
      ),
    );

    const completed = expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId: lead.id,
      }),
    );
    expect(completed.lead.stage).toBe("FULFILLMENT");
    expect(completed.blockingFields).toEqual([]);
    expect(completed.venues[0].solesAccount).toMatchObject({
      currency: "PEN",
      banco: "BCP",
      tipoCuenta: "AHORROS",
      nroCuenta: "19100000000001",
      isSettlement: true,
    });
  });
});
