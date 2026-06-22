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
  leadId: string;
  action: FulfillmentAction;
  file: { name: string; sizeBytes: number; stream: ReadableStream<Uint8Array> };
};

type ProofUpload = {
  leadId: string;
  unitId: string;
  file: { name: string; sizeBytes: number; stream: ReadableStream<Uint8Array> };
};

function parseDocUpload(
  leadId: unknown,
  action: unknown,
  formData: unknown,
): Result<DocUpload, DomainError> {
  const fields = parseObject({ leadId, action }, validationFail, (r) => ({
    leadId: r.str("leadId"),
    action: r.enum("action", FULFILLMENT_ACTIONS),
  }));
  if (!fields.ok) return fields;

  if (!(formData instanceof FormData)) {
    return Err(invalid({ code: "invalid_input" }));
  }
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

function parseProofUpload(
  leadId: unknown,
  unitId: unknown,
  formData: unknown,
): Result<ProofUpload, DomainError> {
  const fields = parseObject({ leadId, unitId }, validationFail, (r) => ({
    leadId: r.str("leadId"),
    unitId: r.str("unitId"),
  }));
  if (!fields.ok) return fields;

  if (!(formData instanceof FormData)) {
    return Err(invalid({ code: "invalid_input" }));
  }
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
        (r): ChooseFulfillmentProductInput => ({
          leadId: r.str("leadId"),
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

export async function uploadFulfillmentDocument(
  rawLeadId: string,
  rawAction: string,
  formData: FormData,
) {
  return runAction({
    name: "workflow.upload_fulfillment_document",
    access: { kind: "auth" },
    parse: () => parseDocUpload(rawLeadId, rawAction, formData),
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
          artifactId: uploaded.value.artifactId,
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
        (r): RecordUnitSerialInput => ({
          leadId: r.str("leadId"),
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
        (r): RegisterUnitPaymentLinkInput => ({
          leadId: r.str("leadId"),
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

export async function uploadFulfillmentPaymentProof(
  rawLeadId: string,
  rawUnitId: string,
  formData: FormData,
) {
  return runAction({
    name: "workflow.upload_fulfillment_payment_proof",
    access: { kind: "auth" },
    parse: () => parseProofUpload(rawLeadId, rawUnitId, formData),
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
          artifactId: uploaded.value.artifactId,
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
      parseObject(input, validationFail, (r) => ({ leadId: r.str("leadId") })),
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
        (r): RejectFulfillmentStepInput => ({
          leadId: r.str("leadId"),
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
        (r): RegisterUnitSaleInput => ({
          leadId: r.str("leadId"),
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
        leadId: r.str("leadId"),
        artifactId: r.str("artifactId"),
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
