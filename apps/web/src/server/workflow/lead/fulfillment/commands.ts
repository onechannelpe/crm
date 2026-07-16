import type {
  FulfillmentAction,
  ProductKind,
} from "~/contracts/workflow/vocabulary";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type {
  FileAssetId,
  FulfillmentOrderId,
  WorkflowLeadId,
  WorkflowVenueId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

import { completeFulfillment } from "../domain/decide";
import {
  createHistoryEvent,
  type LeadHistoryEventDraft,
} from "../domain/history";
import { authorizeFulfillmentStep } from "../domain/policy";
import type { LeadState } from "../domain/state";
import { runLeadTransaction, type LeadTransaction } from "../write/transition";
import type { FulfillmentOrderDetails, FulfillmentUnit } from "./repo";
import {
  nextStep,
  rejectRuleForStep,
  stepDefinition,
  type UnitField,
} from "./steps";

type Ports = { executor: DatabaseExecutor; now: Date };
type LeadResult = Result<{ leadId: string }, DomainError>;

type Loaded = { state: LeadState; details: FulfillmentOrderDetails };

// Reads the order's persisted step rather than the action's, because
// record_serials maps to two steps (refurbished AWAITING_SERIALS and new-POS
// AWAITING_SERIAL_ENTRY).
async function loadForAction(
  ctx: LeadTransaction,
  input: {
    leadId: WorkflowLeadId;
    actor: WorkflowActor;
    action: FulfillmentAction;
  },
): Promise<Result<Loaded, DomainError>> {
  const state = await ctx.repos.leads.findById(input.leadId);
  if (!state) return Err(fail("lead_not_found"));

  const details = await ctx.repos.fulfillment.findByLeadId(input.leadId);
  if (!details) return Err(fail("fulfillment_not_started"));

  const currentStep = details.order.currentStep;
  if (stepDefinition(currentStep).action !== input.action) {
    return Err(fail("invalid_fulfillment_step"));
  }

  const authz = authorizeFulfillmentStep(currentStep, input.actor, state);
  if (!authz.ok) return authz;

  return Ok({ state, details });
}

function unitHasField(unit: FulfillmentUnit, field: UnitField): boolean {
  switch (field) {
    case "serial_number":
      return unit.serial !== null;
    case "payment_url":
      return unit.paymentUrl !== null;
    case "payment_proof_file_asset_id":
      return unit.paymentProofFileAssetId !== null;
    case "service_a_ref":
      return unit.serviceRef !== null;
    default: {
      field satisfies never;
      return false;
    }
  }
}

// Completing fulfillment moves the lead to LIVE in the same transaction.
async function advance(
  ctx: LeadTransaction,
  loaded: Loaded,
  input: {
    actor: WorkflowActor;
    action: FulfillmentAction;
    productKind: ProductKind;
    extraEvents?: LeadHistoryEventDraft[];
  },
): Promise<LeadResult> {
  const { order } = loaded.details;
  const from = order.currentStep;
  const to = nextStep(input.productKind, from);

  await ctx.repos.fulfillment.setStep(order.id, to, ctx.now);

  const extra = input.extraEvents ?? [];

  if (to === "COMPLETED") {
    const transition = completeFulfillment(loaded.state, {
      actor: input.actor,
      orderId: order.id,
      now: ctx.now,
    });
    if (!transition.ok) return transition;

    const committed = await ctx.commitTransition(transition.value);
    if (!committed.ok) return committed;

    if (extra.length > 0) {
      const facts = await ctx.appendFacts(extra);
      if (!facts.ok) return facts;
    }
    return Ok({ leadId: loaded.state.id });
  }

  const facts = await ctx.appendFacts([
    createHistoryEvent({
      leadId: loaded.state.id,
      eventType: "fulfillment_step_advanced",
      actorUserId: input.actor.userId,
      payload: { orderId: order.id, from, to, action: input.action },
      occurredAt: ctx.now,
    }),
    ...extra,
  ]);
  if (!facts.ok) return facts;

  return Ok({ leadId: loaded.state.id });
}

function requireProductKind(
  details: FulfillmentOrderDetails,
): Result<ProductKind, DomainError> {
  if (details.order.productKind === null) {
    return Err(fail("fulfillment_product_required"));
  }
  return Ok(details.order.productKind);
}

export async function chooseFulfillmentProductCommand(
  input: {
    leadId: WorkflowLeadId;
    productKind: ProductKind;
    actor: WorkflowActor;
  },
  ports: Ports,
): Promise<LeadResult> {
  return runLeadTransaction(ports, async (ctx) => {
    const loaded = await loadForAction(ctx, {
      leadId: input.leadId,
      actor: input.actor,
      action: "choose_product",
    });
    if (!loaded.ok) return loaded;

    const { order } = loaded.value.details;
    await ctx.repos.fulfillment.setProductKind(
      order.id,
      input.productKind,
      ctx.now,
    );

    const venuesResult = await ctx.repos.leadVenues.listByLeadId(input.leadId);
    if (!venuesResult.ok) return venuesResult;
    const units = buildUnits(input.productKind, venuesResult.value, {
      orderId: order.id,
      now: ctx.now,
    });
    await ctx.repos.fulfillment.createUnits(units);

    const to = nextStep(input.productKind, "CHOOSE_PRODUCT");
    await ctx.repos.fulfillment.setStep(order.id, to, ctx.now);

    const facts = await ctx.appendFacts([
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "fulfillment_product_chosen",
        actorUserId: input.actor.userId,
        payload: { orderId: order.id, productKind: input.productKind },
        occurredAt: ctx.now,
      }),
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "fulfillment_step_advanced",
        actorUserId: input.actor.userId,
        payload: {
          orderId: order.id,
          from: "CHOOSE_PRODUCT",
          to,
          action: "choose_product",
        },
        occurredAt: ctx.now,
      }),
    ]);
    if (!facts.ok) return facts;

    return Ok({ leadId: input.leadId });
  });
}

function buildUnits(
  productKind: ProductKind,
  venues: Array<{
    id: WorkflowVenueId;
    tradeName: string;
    posQuantity: number;
  }>,
  context: { orderId: FulfillmentOrderId; now: Date },
): Array<{
  orderId: FulfillmentOrderId;
  venueId: WorkflowVenueId | null;
  label: string;
  now: Date;
}> {
  if (productKind === "digital_only") {
    return [
      {
        orderId: context.orderId,
        venueId: null,
        label: "Registro digital",
        now: context.now,
      },
    ];
  }

  const units: Array<{
    orderId: FulfillmentOrderId;
    venueId: WorkflowVenueId | null;
    label: string;
    now: Date;
  }> = [];
  for (const venue of venues) {
    const count = Math.max(1, venue.posQuantity);
    for (let i = 1; i <= count; i += 1) {
      units.push({
        orderId: context.orderId,
        venueId: venue.id,
        label: `${venue.tradeName} POS ${i}`,
        now: context.now,
      });
    }
  }
  if (units.length === 0) {
    units.push({
      orderId: context.orderId,
      venueId: null,
      label: "POS 1",
      now: context.now,
    });
  }
  return units;
}

export async function attachFulfillmentDocumentCommand(
  input: {
    leadId: WorkflowLeadId;
    fileAssetId: FileAssetId;
    action: FulfillmentAction;
    actor: WorkflowActor;
  },
  ports: Ports,
): Promise<LeadResult> {
  return runLeadTransaction(ports, async (ctx) => {
    const loaded = await loadForAction(ctx, {
      leadId: input.leadId,
      actor: input.actor,
      action: input.action,
    });
    if (!loaded.ok) return loaded;

    const productKind = requireProductKind(loaded.value.details);
    if (!productKind.ok) return productKind;

    const def = stepDefinition(loaded.value.details.order.currentStep);
    if (def.kind !== "document") return Err(fail("invalid_fulfillment_step"));

    await ctx.repos.fulfillment.addDocument({
      orderId: loaded.value.details.order.id,
      docKind: def.docKind,
      fileAssetId: input.fileAssetId,
      uploadedByUserId: input.actor.userId,
      now: ctx.now,
    });

    return advance(ctx, loaded.value, {
      actor: input.actor,
      action: input.action,
      productKind: productKind.value,
      extraEvents: [
        createHistoryEvent({
          leadId: input.leadId,
          eventType: "fulfillment_document_uploaded",
          actorUserId: input.actor.userId,
          payload: {
            orderId: loaded.value.details.order.id,
            docKind: def.docKind,
            fileAssetId: input.fileAssetId,
          },
          occurredAt: ctx.now,
        }),
      ],
    });
  });
}

// Advance only after every order unit has this value.
async function recordUnitValueCommand(
  input: {
    leadId: WorkflowLeadId;
    unitId: string;
    action: FulfillmentAction;
    actor: WorkflowActor;
  },
  ports: Ports,
  apply: (
    unit: FulfillmentUnit,
    ctx: LeadTransaction,
  ) => Promise<Result<void, DomainError>>,
  field: UnitField,
): Promise<LeadResult> {
  return runLeadTransaction(ports, async (ctx) => {
    const loaded = await loadForAction(ctx, {
      leadId: input.leadId,
      actor: input.actor,
      action: input.action,
    });
    if (!loaded.ok) return loaded;

    const productKind = requireProductKind(loaded.value.details);
    if (!productKind.ok) return productKind;

    const unit = loaded.value.details.units.find((u) => u.id === input.unitId);
    if (!unit) return Err(fail("fulfillment_unit_not_found"));

    const applied = await apply(unit, ctx);
    if (!applied.ok) return applied;

    const allFilled = loaded.value.details.units.every((u) =>
      u.id === input.unitId ? true : unitHasField(u, field),
    );
    if (!allFilled) return Ok({ leadId: input.leadId });

    return advance(ctx, loaded.value, {
      actor: input.actor,
      action: input.action,
      productKind: productKind.value,
    });
  });
}

export async function recordUnitSerialCommand(
  input: {
    leadId: WorkflowLeadId;
    unitId: string;
    serial: string;
    actor: WorkflowActor;
  },
  ports: Ports,
): Promise<LeadResult> {
  const action: FulfillmentAction = "record_serials";
  return recordUnitValueCommand(
    { ...input, action },
    ports,
    async (unit, ctx) => {
      await ctx.repos.fulfillment.setUnitField(
        unit.id,
        "serial_number",
        input.serial,
      );
      return Ok(undefined);
    },
    "serial_number",
  );
}

export async function registerUnitPaymentLinkCommand(
  input: {
    leadId: WorkflowLeadId;
    unitId: string;
    paymentUrl: string;
    actor: WorkflowActor;
  },
  ports: Ports,
): Promise<LeadResult> {
  return recordUnitValueCommand(
    { ...input, action: "register_payment_link" },
    ports,
    async (unit, ctx) => {
      await ctx.repos.fulfillment.setUnitField(
        unit.id,
        "payment_url",
        input.paymentUrl,
      );
      return Ok(undefined);
    },
    "payment_url",
  );
}

export async function uploadUnitPaymentProofCommand(
  input: {
    leadId: WorkflowLeadId;
    unitId: string;
    fileAssetId: FileAssetId;
    actor: WorkflowActor;
  },
  ports: Ports,
): Promise<LeadResult> {
  return recordUnitValueCommand(
    { ...input, action: "upload_payment_proof" },
    ports,
    async (unit, ctx) => {
      await ctx.repos.fulfillment.setUnitField(
        unit.id,
        "payment_proof_file_asset_id",
        input.fileAssetId,
      );
      await ctx.repos.fulfillment.addDocument({
        orderId: unit.orderId,
        docKind: "payment_proof",
        fileAssetId: input.fileAssetId,
        uploadedByUserId: input.actor.userId,
        now: ctx.now,
      });
      return Ok(undefined);
    },
    "payment_proof_file_asset_id",
  );
}

export async function registerUnitSaleCommand(
  input: {
    leadId: WorkflowLeadId;
    unitId: string;
    serviceRef: string;
    actor: WorkflowActor;
  },
  ports: Ports,
): Promise<LeadResult> {
  return recordUnitValueCommand(
    { ...input, action: "register_sale" },
    ports,
    async (unit, ctx) => {
      await ctx.repos.fulfillment.setUnitField(
        unit.id,
        "service_a_ref",
        input.serviceRef,
      );
      return Ok(undefined);
    },
    "service_a_ref",
  );
}

// Only configured document handoffs can be rejected.
export async function rejectFulfillmentStepCommand(
  input: { leadId: WorkflowLeadId; reason: string; actor: WorkflowActor },
  ports: Ports,
): Promise<LeadResult> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const details = await ctx.repos.fulfillment.findByLeadId(input.leadId);
    if (!details) return Err(fail("fulfillment_not_started"));

    if (input.reason.trim().length === 0) {
      return Err(fail("reject_reason_required"));
    }

    const from = details.order.currentStep;
    const rule = rejectRuleForStep(from);
    if (rule === null) return Err(fail("invalid_fulfillment_step"));

    const authz = authorizeFulfillmentStep(from, input.actor, state);
    if (!authz.ok) return authz;

    if (rule.clearField) {
      await ctx.repos.fulfillment.clearUnitField(
        details.order.id,
        rule.clearField,
      );
    }
    await ctx.repos.fulfillment.setStep(details.order.id, rule.to, ctx.now);

    const facts = await ctx.appendFacts([
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "fulfillment_step_rejected",
        actorUserId: input.actor.userId,
        payload: {
          orderId: details.order.id,
          from,
          to: rule.to,
          reason: input.reason,
        },
        occurredAt: ctx.now,
      }),
    ]);
    if (!facts.ok) return facts;

    return Ok({ leadId: input.leadId });
  });
}

export async function validateFulfillmentPaymentCommand(
  input: { leadId: WorkflowLeadId; actor: WorkflowActor },
  ports: Ports,
): Promise<LeadResult> {
  return runLeadTransaction(ports, async (ctx) => {
    const loaded = await loadForAction(ctx, {
      leadId: input.leadId,
      actor: input.actor,
      action: "validate_payment",
    });
    if (!loaded.ok) return loaded;

    const productKind = requireProductKind(loaded.value.details);
    if (!productKind.ok) return productKind;

    await ctx.repos.fulfillment.markPaymentsValidated(
      loaded.value.details.order.id,
    );

    return advance(ctx, loaded.value, {
      actor: input.actor,
      action: "validate_payment",
      productKind: productKind.value,
    });
  });
}
