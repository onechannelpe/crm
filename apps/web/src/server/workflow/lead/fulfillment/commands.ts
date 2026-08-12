import type {
  FulfillmentAction,
  ProductKind,
} from "~/contracts/workflow/vocabulary";
import { fail, type DomainError } from "~/domain/errors";
import type {
  FileAssetId,
  FulfillmentOrderId,
  WorkflowLeadId,
  WorkflowVenueId,
} from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

import { completeFulfillment } from "../domain/decide";
import {
  createHistoryEvent,
  leadNotificationContext,
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

type LeadResult = Result<{ leadId: string }, DomainError>;

type Loaded = {
  state: LeadState;
  details: FulfillmentOrderDetails;
};

// `record_serials` maps to different steps for refurbished and new POS orders.
async function loadForAction(
  ctx: LeadTransaction,
  input: {
    leadId: WorkflowLeadId;
    actor: WorkflowActor;
    action: FulfillmentAction;
  },
): Promise<Result<Loaded, DomainError>> {
  const state = await ctx.repos.leads.findById(input.leadId);

  if (!state) {
    return Err(fail("lead_not_found"));
  }

  const details = await ctx.repos.fulfillment.findByLeadId(input.leadId);

  if (!details) {
    return Err(fail("fulfillment_not_started"));
  }

  const currentStep = details.order.currentStep;

  if (stepDefinition(currentStep).action !== input.action) {
    return Err(fail("invalid_fulfillment_step"));
  }

  const authz = authorizeFulfillmentStep(currentStep, input.actor, state);

  if (!authz.ok) {
    return authz;
  }

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

// Completing fulfillment also moves the lead to LIVE.
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
  const extra = input.extraEvents ?? [];

  await ctx.repos.fulfillment.setStep(order.id, to, ctx.operationAt);

  if (to === "COMPLETED") {
    const transition = completeFulfillment(loaded.state, {
      actor: input.actor,
      orderId: order.id,
      occurredAt: ctx.operationAt,
    });

    if (!transition.ok) {
      return transition;
    }

    const committed = await ctx.commitTransition(transition.value);

    if (!committed.ok) {
      return committed;
    }

    if (extra.length > 0) {
      const facts = await ctx.appendFacts(extra);

      if (!facts.ok) {
        return facts;
      }
    }

    return Ok({ leadId: loaded.state.id });
  }

  // The link(s) become the notification body, so fetch the freshly written
  // values here rather than reuse `loaded.details.units`, which was read
  // before this call wrote the unit that just completed the step.
  const paymentUnits =
    to === "AWAITING_PAYMENT"
      ? await ctx.repos.fulfillment.listUnitPayments(order.id)
      : undefined;

  const facts = await ctx.appendFacts([
    createHistoryEvent({
      leadId: loaded.state.id,
      eventType: "fulfillment_step_advanced",
      actorUserId: input.actor.userId,
      payload: {
        orderId: order.id,
        from,
        to,
        action: input.action,
      },
      notificationContext: {
        ...leadNotificationContext(loaded.state),
        ...(paymentUnits ? { paymentUnits } : {}),
      },
      occurredAt: ctx.operationAt,
    }),
    ...extra,
  ]);

  if (!facts.ok) {
    return facts;
  }

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
  scope: WorkflowWriteContext,
): Promise<LeadResult> {
  return runLeadTransaction(scope, async (ctx) => {
    const loaded = await loadForAction(ctx, {
      leadId: input.leadId,
      actor: input.actor,
      action: "choose_product",
    });

    if (!loaded.ok) {
      return loaded;
    }

    const { order } = loaded.value.details;

    await ctx.repos.fulfillment.setProductKind(
      order.id,
      input.productKind,
      ctx.operationAt,
    );

    const venuesResult = await ctx.repos.leadVenues.listByLeadId(input.leadId);

    if (!venuesResult.ok) {
      return venuesResult;
    }

    const units = buildUnits(input.productKind, venuesResult.value, {
      orderId: order.id,
      createdAt: ctx.operationAt,
    });

    await ctx.repos.fulfillment.createUnits(units);

    const to = nextStep(input.productKind, "CHOOSE_PRODUCT");

    await ctx.repos.fulfillment.setStep(order.id, to, ctx.operationAt);

    const facts = await ctx.appendFacts([
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "fulfillment_product_chosen",
        actorUserId: input.actor.userId,
        payload: {
          orderId: order.id,
          productKind: input.productKind,
        },
        occurredAt: ctx.operationAt,
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
        occurredAt: ctx.operationAt,
      }),
    ]);

    if (!facts.ok) {
      return facts;
    }

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
  context: {
    orderId: FulfillmentOrderId;
    createdAt: Date;
  },
): Array<{
  orderId: FulfillmentOrderId;
  venueId: WorkflowVenueId | null;
  label: string;
  createdAt: Date;
}> {
  if (productKind === "digital_only") {
    return [
      {
        orderId: context.orderId,
        venueId: null,
        label: "Registro digital",
        createdAt: context.createdAt,
      },
    ];
  }

  const units: Array<{
    orderId: FulfillmentOrderId;
    venueId: WorkflowVenueId | null;
    label: string;
    createdAt: Date;
  }> = [];

  for (const venue of venues) {
    const count = Math.max(1, venue.posQuantity);

    for (let index = 1; index <= count; index += 1) {
      units.push({
        orderId: context.orderId,
        venueId: venue.id,
        label: `${venue.tradeName} POS ${index}`,
        createdAt: context.createdAt,
      });
    }
  }

  if (units.length === 0) {
    units.push({
      orderId: context.orderId,
      venueId: null,
      label: "POS 1",
      createdAt: context.createdAt,
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
  scope: WorkflowWriteContext,
): Promise<LeadResult> {
  return runLeadTransaction(scope, async (ctx) => {
    const loaded = await loadForAction(ctx, {
      leadId: input.leadId,
      actor: input.actor,
      action: input.action,
    });

    if (!loaded.ok) {
      return loaded;
    }

    const productKind = requireProductKind(loaded.value.details);

    if (!productKind.ok) {
      return productKind;
    }

    const definition = stepDefinition(loaded.value.details.order.currentStep);

    if (definition.kind !== "document") {
      return Err(fail("invalid_fulfillment_step"));
    }

    await ctx.repos.fulfillment.addDocument({
      orderId: loaded.value.details.order.id,
      docKind: definition.docKind,
      fileAssetId: input.fileAssetId,
      uploadedByUserId: input.actor.userId,
      createdAt: ctx.operationAt,
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
            docKind: definition.docKind,
            fileAssetId: input.fileAssetId,
          },
          occurredAt: ctx.operationAt,
        }),
      ],
    });
  });
}

// Advance only after every unit has the required value.
async function recordUnitValueCommand(
  input: {
    leadId: WorkflowLeadId;
    unitId: string;
    action: FulfillmentAction;
    actor: WorkflowActor;
  },
  scope: WorkflowWriteContext,
  apply: (
    unit: FulfillmentUnit,
    ctx: LeadTransaction,
  ) => Promise<Result<void, DomainError>>,
  field: UnitField,
): Promise<LeadResult> {
  return runLeadTransaction(scope, async (ctx) => {
    const loaded = await loadForAction(ctx, {
      leadId: input.leadId,
      actor: input.actor,
      action: input.action,
    });

    if (!loaded.ok) {
      return loaded;
    }

    const productKind = requireProductKind(loaded.value.details);

    if (!productKind.ok) {
      return productKind;
    }

    const unit = loaded.value.details.units.find(
      (candidate) => candidate.id === input.unitId,
    );

    if (!unit) {
      return Err(fail("fulfillment_unit_not_found"));
    }

    const applied = await apply(unit, ctx);

    if (!applied.ok) {
      return applied;
    }

    const allFilled = loaded.value.details.units.every((candidate) =>
      candidate.id === input.unitId ? true : unitHasField(candidate, field),
    );

    if (!allFilled) {
      return Ok({ leadId: input.leadId });
    }

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
  scope: WorkflowWriteContext,
): Promise<LeadResult> {
  return recordUnitValueCommand(
    {
      ...input,
      action: "record_serials",
    },
    scope,
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
  scope: WorkflowWriteContext,
): Promise<LeadResult> {
  return recordUnitValueCommand(
    {
      ...input,
      action: "register_payment_link",
    },
    scope,
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
  scope: WorkflowWriteContext,
): Promise<LeadResult> {
  return recordUnitValueCommand(
    {
      ...input,
      action: "upload_payment_proof",
    },
    scope,
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
        createdAt: ctx.operationAt,
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
  scope: WorkflowWriteContext,
): Promise<LeadResult> {
  return recordUnitValueCommand(
    {
      ...input,
      action: "register_sale",
    },
    scope,
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

export async function rejectFulfillmentStepCommand(
  input: {
    leadId: WorkflowLeadId;
    reason: string;
    actor: WorkflowActor;
  },
  scope: WorkflowWriteContext,
): Promise<LeadResult> {
  return runLeadTransaction(scope, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const details = await ctx.repos.fulfillment.findByLeadId(input.leadId);

    if (!details) {
      return Err(fail("fulfillment_not_started"));
    }

    if (input.reason.trim().length === 0) {
      return Err(fail("reject_reason_required"));
    }

    const from = details.order.currentStep;
    const rule = rejectRuleForStep(from);

    if (rule === null) {
      return Err(fail("invalid_fulfillment_step"));
    }

    const authz = authorizeFulfillmentStep(from, input.actor, state);

    if (!authz.ok) {
      return authz;
    }

    if (rule.clearField) {
      await ctx.repos.fulfillment.clearUnitField(
        details.order.id,
        rule.clearField,
      );
    }

    await ctx.repos.fulfillment.setStep(
      details.order.id,
      rule.to,
      ctx.operationAt,
    );

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
        notificationContext: leadNotificationContext(state),
        occurredAt: ctx.operationAt,
      }),
    ]);

    if (!facts.ok) {
      return facts;
    }

    return Ok({ leadId: input.leadId });
  });
}

export async function validateFulfillmentPaymentCommand(
  input: {
    leadId: WorkflowLeadId;
    actor: WorkflowActor;
  },
  scope: WorkflowWriteContext,
): Promise<LeadResult> {
  return runLeadTransaction(scope, async (ctx) => {
    const loaded = await loadForAction(ctx, {
      leadId: input.leadId,
      actor: input.actor,
      action: "validate_payment",
    });

    if (!loaded.ok) {
      return loaded;
    }

    const productKind = requireProductKind(loaded.value.details);

    if (!productKind.ok) {
      return productKind;
    }

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
