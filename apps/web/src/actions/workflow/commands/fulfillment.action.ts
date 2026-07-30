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
import { fail, invalid, type DomainError } from "~/domain/errors";
import { FileAssetId, WorkflowLeadId } from "~/domain/ids";
import { runAction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getWorkflowRuntime } from "~/server/platform/container/workflow-runtime";
import {
  chooseFulfillmentProductCommand,
  recordUnitSerialCommand,
  registerUnitPaymentLinkCommand,
  registerUnitSaleCommand,
  rejectFulfillmentStepCommand,
  validateFulfillmentPaymentCommand,
} from "~/server/workflow/lead/fulfillment/commands";
import { Err, Ok, type Result } from "~/shared/result";

import { workflowActor } from "./actor";

type DocUpload = {
  leadId: WorkflowLeadId;
  action: FulfillmentAction;
  file: {
    name: string;
    sizeBytes: number;
    stream: ReadableStream<Uint8Array>;
  };
};

type ProofUpload = {
  leadId: WorkflowLeadId;
  unitId: string;
  file: {
    name: string;
    sizeBytes: number;
    stream: ReadableStream<Uint8Array>;
  };
};

function parseFulfillmentDocumentUpload(
  formData: unknown,
): Result<DocUpload, DomainError> {
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
      leadId: r.id("leadId", WorkflowLeadId),
      action: r.enum("action", FULFILLMENT_ACTIONS),
    }),
  );

  if (!fields.ok) {
    return fields;
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Err(fail("file_required"));
  }

  return Ok({
    leadId: fields.value.leadId,
    action: fields.value.action,
    file: {
      name: file.name,
      sizeBytes: file.size,
      stream: file.stream(),
    },
  });
}

function parseFulfillmentPaymentProofUpload(
  formData: unknown,
): Result<ProofUpload, DomainError> {
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
      leadId: r.id("leadId", WorkflowLeadId),
      unitId: r.str("unitId"),
    }),
  );

  if (!fields.ok) {
    return fields;
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Err(fail("file_required"));
  }

  return Ok({
    leadId: fields.value.leadId,
    unitId: fields.value.unitId,
    file: {
      name: file.name,
      sizeBytes: file.size,
      stream: file.stream(),
    },
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
          leadId: r.id("leadId", WorkflowLeadId),
          productKind: r.enum("productKind", PRODUCT_KINDS),
        }),
      ),

    audit: ({ leadId, productKind }) => ({ leadId, productKind }),

    execute: ({ actor }, payload) =>
      chooseFulfillmentProductCommand(
        {
          actor: workflowActor(actor),
          ...payload,
        },
        getWorkflowRuntime().ports(),
      ),
  });
}

export async function uploadFulfillmentDocument(formData: FormData) {
  return runAction({
    name: "workflow.upload_fulfillment_document",
    access: { kind: "auth" },
    parse: () => parseFulfillmentDocumentUpload(formData),

    audit: ({ leadId, action, file }) => ({
      leadId,
      action,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),

    execute: (ctx, { leadId, action, file }) =>
      getWorkflowRuntime().leadFiles.uploadFulfillmentDocument({
        ctx,
        leadId,
        action,
        file,
      }),
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
          leadId: r.id("leadId", WorkflowLeadId),
          unitId: r.str("unitId"),
          serial: r.str("serial"),
        }),
      ),

    audit: ({ leadId, unitId }) => ({ leadId, unitId }),

    execute: ({ actor }, payload) =>
      recordUnitSerialCommand(
        {
          actor: workflowActor(actor),
          ...payload,
        },
        getWorkflowRuntime().ports(),
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
          leadId: r.id("leadId", WorkflowLeadId),
          unitId: r.str("unitId"),
          paymentUrl: r.str("paymentUrl"),
        }),
      ),

    audit: ({ leadId, unitId }) => ({ leadId, unitId }),

    execute: ({ actor }, payload) =>
      registerUnitPaymentLinkCommand(
        {
          actor: workflowActor(actor),
          ...payload,
        },
        getWorkflowRuntime().ports(),
      ),
  });
}

export async function uploadFulfillmentPaymentProof(formData: FormData) {
  return runAction({
    name: "workflow.upload_fulfillment_payment_proof",
    access: { kind: "auth" },
    parse: () => parseFulfillmentPaymentProofUpload(formData),

    audit: ({ leadId, unitId, file }) => ({
      leadId,
      unitId,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
    }),

    execute: (ctx, { leadId, unitId, file }) =>
      getWorkflowRuntime().leadFiles.uploadFulfillmentPaymentProof({
        ctx,
        leadId,
        unitId,
        file,
      }),
  });
}

export async function validateFulfillmentPayment(input: unknown) {
  return runAction({
    name: "workflow.validate_fulfillment_payment",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, { leadId }) =>
      validateFulfillmentPaymentCommand(
        {
          actor: workflowActor(actor),
          leadId,
        },
        getWorkflowRuntime().ports(),
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
          leadId: r.id("leadId", WorkflowLeadId),
          reason: r.str("reason"),
        }),
      ),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      rejectFulfillmentStepCommand(
        {
          actor: workflowActor(actor),
          ...payload,
        },
        getWorkflowRuntime().ports(),
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
          leadId: r.id("leadId", WorkflowLeadId),
          unitId: r.str("unitId"),
          serviceRef: r.str("serviceRef"),
        }),
      ),

    audit: ({ leadId, unitId }) => ({ leadId, unitId }),

    execute: ({ actor }, payload) =>
      registerUnitSaleCommand(
        {
          actor: workflowActor(actor),
          ...payload,
        },
        getWorkflowRuntime().ports(),
      ),
  });
}

export async function requestFulfillmentDownloadToken(input: {
  leadId: string;
  fileId: string;
}) {
  return runAction({
    name: "workflow.request_fulfillment_download_token",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        fileAssetId: r.id("fileId", FileAssetId),
      })),

    audit: ({ leadId, fileAssetId }) => ({
      leadId,
      fileAssetId,
    }),

    execute: (ctx, { leadId, fileAssetId }) =>
      getWorkflowRuntime().leadFiles.requestFulfillmentDownloadToken({
        ctx,
        leadId,
        fileAssetId,
      }),
  });
}
