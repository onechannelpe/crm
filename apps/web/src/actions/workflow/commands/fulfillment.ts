"use server";

import type {
  ChooseFulfillmentProductInput,
  RecordUnitSerialInput,
  RegisterUnitPaymentLinkInput,
  RegisterUnitSaleInput,
  RejectFulfillmentStepInput,
} from "~/contracts/workflow/inputs";
import {
  FULFILLMENT_ACTIONS,
  PRODUCT_KINDS,
  type FulfillmentAction,
} from "~/contracts/workflow/vocabulary";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, invalid, type DomainError } from "~/server/shared/domain-error";
import {
  asWorkflowArtifactId,
  asWorkflowLeadId,
  type WorkflowLeadId,
} from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";
import {
  attachFulfillmentDocumentCommand,
  chooseFulfillmentProductCommand,
  recordUnitSerialCommand,
  registerUnitPaymentLinkCommand,
  registerUnitSaleCommand,
  rejectFulfillmentStepCommand,
  uploadUnitPaymentProofCommand,
  validateFulfillmentPaymentCommand,
} from "~/server/workflow/lead/fulfillment/commands";
import { docKindForAction } from "~/server/workflow/lead/fulfillment/steps";

import { workflowActor } from "./actor";

type DocUpload = {
  leadId: WorkflowLeadId;
  action: FulfillmentAction;
  file: { name: string; sizeBytes: number; stream: ReadableStream<Uint8Array> };
};

type ProofUpload = {
  leadId: WorkflowLeadId;
  unitId: string;
  file: { name: string; sizeBytes: number; stream: ReadableStream<Uint8Array> };
};

function parseDocUpload(formData: unknown): Result<DocUpload, DomainError> {
  if (!(formData instanceof FormData)) {
    return Err(invalid({ code: "invalid_input" }));
  }

  const fields = parseObject(
    {
      leadId: formData.get("leadId"),
      action: formData.get("action"),
    },
    validationFail,
    (r) => ({
      leadId: asWorkflowLeadId(r.str("leadId")),
      action: r.enum("action", FULFILLMENT_ACTIONS),
    }),
  );
  if (!fields.ok) return fields;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Err(fail("file_required"));
  }

  return Ok({
    leadId: fields.value.leadId,
    action: fields.value.action,
    file: { name: file.name, sizeBytes: file.size, stream: file.stream() },
  });
}

function parseProofUpload(formData: unknown): Result<ProofUpload, DomainError> {
  if (!(formData instanceof FormData)) {
    return Err(invalid({ code: "invalid_input" }));
  }

  const fields = parseObject(
    {
      leadId: formData.get("leadId"),
      unitId: formData.get("unitId"),
    },
    validationFail,
    (r) => ({
      leadId: asWorkflowLeadId(r.str("leadId")),
      unitId: r.str("unitId"),
    }),
  );
  if (!fields.ok) return fields;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Err(fail("file_required"));
  }

  return Ok({
    leadId: fields.value.leadId,
    unitId: fields.value.unitId,
    file: { name: file.name, sizeBytes: file.size, stream: file.stream() },
  });
}

export async function chooseFulfillmentProduct(input: unknown) {
  return runAction({
    name: "workflow.choose_fulfillment_product",
    access: { kind: "auth" },
    parse: () =>
      parseObject(
        input,
        validationFail,
        (
          r,
        ): Omit<ChooseFulfillmentProductInput, "leadId"> & {
          leadId: WorkflowLeadId;
        } => ({
          leadId: asWorkflowLeadId(r.str("leadId")),
          productKind: r.enum("productKind", PRODUCT_KINDS),
        }),
      ),
    audit: ({ leadId, productKind }) => ({ leadId, productKind }),
    execute: ({ actor }, payload) =>
      chooseFulfillmentProductCommand(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
  });
}

export async function uploadFulfillmentDocument(formData: FormData) {
  return runAction({
    name: "workflow.upload_fulfillment_document",
    access: { kind: "auth" },
    parse: () => parseDocUpload(formData),
    audit: ({ leadId, action, file }) => ({
      leadId,
      action,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),
    execute: async (ctx, { leadId, action, file }) => {
      const docKind = docKindForAction(action);
      if (docKind === null) return Err(fail("invalid_fulfillment_action"));

      const uploaded =
        await getServerRuntime().workflow.leadArtifacts.uploadFulfillmentArtifact(
          { ctx, leadId, docKind, file },
        );
      if (!uploaded.ok) return uploaded;

      return attachFulfillmentDocumentCommand(
        {
          leadId,
          artifactId: asWorkflowArtifactId(uploaded.value.artifactId),
          action,
          actor: workflowActor(ctx.actor),
        },
        getServerRuntime().workflow.ports(),
      );
    },
  });
}

export async function recordFulfillmentSerial(input: unknown) {
  return runAction({
    name: "workflow.record_fulfillment_serial",
    access: { kind: "auth" },
    parse: () =>
      parseObject(
        input,
        validationFail,
        (
          r,
        ): Omit<RecordUnitSerialInput, "leadId"> & {
          leadId: WorkflowLeadId;
        } => ({
          leadId: asWorkflowLeadId(r.str("leadId")),
          unitId: r.str("unitId"),
          serial: r.str("serial"),
        }),
      ),
    audit: ({ leadId, unitId }) => ({ leadId, unitId }),
    execute: ({ actor }, payload) =>
      recordUnitSerialCommand(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
  });
}

export async function registerFulfillmentPaymentLink(input: unknown) {
  return runAction({
    name: "workflow.register_fulfillment_payment_link",
    access: { kind: "auth" },
    parse: () =>
      parseObject(
        input,
        validationFail,
        (
          r,
        ): Omit<RegisterUnitPaymentLinkInput, "leadId"> & {
          leadId: WorkflowLeadId;
        } => ({
          leadId: asWorkflowLeadId(r.str("leadId")),
          unitId: r.str("unitId"),
          paymentUrl: r.str("paymentUrl"),
        }),
      ),
    audit: ({ leadId, unitId }) => ({ leadId, unitId }),
    execute: ({ actor }, payload) =>
      registerUnitPaymentLinkCommand(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
  });
}

export async function uploadFulfillmentPaymentProof(formData: FormData) {
  return runAction({
    name: "workflow.upload_fulfillment_payment_proof",
    access: { kind: "auth" },
    parse: () => parseProofUpload(formData),
    audit: ({ leadId, unitId, file }) => ({
      leadId,
      unitId,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),
    execute: async (ctx, { leadId, unitId, file }) => {
      const uploaded =
        await getServerRuntime().workflow.leadArtifacts.uploadFulfillmentArtifact(
          { ctx, leadId, docKind: "payment_proof", file },
        );
      if (!uploaded.ok) return uploaded;

      return uploadUnitPaymentProofCommand(
        {
          leadId,
          unitId,
          artifactId: asWorkflowArtifactId(uploaded.value.artifactId),
          actor: workflowActor(ctx.actor),
        },
        getServerRuntime().workflow.ports(),
      );
    },
  });
}

export async function validateFulfillmentPayment(input: unknown) {
  return runAction({
    name: "workflow.validate_fulfillment_payment",
    access: { kind: "auth" },
    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: asWorkflowLeadId(r.str("leadId")),
      })),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, { leadId }) =>
      validateFulfillmentPaymentCommand(
        { leadId, actor: workflowActor(actor) },
        getServerRuntime().workflow.ports(),
      ),
  });
}

export async function rejectFulfillmentStep(input: unknown) {
  return runAction({
    name: "workflow.reject_fulfillment_step",
    access: { kind: "auth" },
    parse: () =>
      parseObject(
        input,
        validationFail,
        (
          r,
        ): Omit<RejectFulfillmentStepInput, "leadId"> & {
          leadId: WorkflowLeadId;
        } => ({
          leadId: asWorkflowLeadId(r.str("leadId")),
          reason: r.str("reason"),
        }),
      ),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, payload) =>
      rejectFulfillmentStepCommand(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
  });
}

export async function registerFulfillmentSale(input: unknown) {
  return runAction({
    name: "workflow.register_fulfillment_sale",
    access: { kind: "auth" },
    parse: () =>
      parseObject(
        input,
        validationFail,
        (
          r,
        ): Omit<RegisterUnitSaleInput, "leadId"> & {
          leadId: WorkflowLeadId;
        } => ({
          leadId: asWorkflowLeadId(r.str("leadId")),
          unitId: r.str("unitId"),
          serviceRef: r.str("serviceRef"),
        }),
      ),
    audit: ({ leadId, unitId }) => ({ leadId, unitId }),
    execute: ({ actor }, payload) =>
      registerUnitSaleCommand(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
  });
}

export async function requestFulfillmentDownloadToken(input: {
  leadId: string;
  artifactId: string;
}) {
  return runAction({
    name: "workflow.request_fulfillment_download_token",
    access: { kind: "auth" },
    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: asWorkflowLeadId(r.str("leadId")),
        artifactId: asWorkflowArtifactId(r.str("artifactId")),
      })),
    audit: ({ leadId, artifactId }) => ({ leadId, artifactId }),
    execute: (ctx, { leadId, artifactId }) =>
      getServerRuntime().workflow.leadArtifacts.requestFulfillmentDownloadToken(
        {
          ctx,
          leadId,
          artifactId,
        },
      ),
  });
}
