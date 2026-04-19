import {
  SALES_RECORD_ATTEMPT_OUTCOMES,
  SALES_RECORD_SOURCES,
} from "~/actions/sales-records/contracts";
import type {
  CreateSalesRecordDraftInput,
  SalesRecordAttemptOutcome,
  SalesRecordAddressInput,
  SalesRecordProductInput,
  RegisterSalesRecordAttemptInput,
  SalesRecordSource,
} from "~/actions/sales-records/contracts";
import { validationError } from "~/lib/app-errors";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import {
  type ContactId,
  asContactId,
  isAssignmentId,
} from "~/server/shared/ids";

function isSalesRecordSource(value: string): value is SalesRecordSource {
  return SALES_RECORD_SOURCES.some((source) => source === value);
}

function isSalesRecordAttemptOutcome(
  value: string,
): value is SalesRecordAttemptOutcome {
  return SALES_RECORD_ATTEMPT_OUTCOMES.some((outcome) => outcome === value);
}

function parseSalesRecordAddresses(
  addresses: SalesRecordAddressInput[],
): SalesRecordAddressInput[] {
  addresses.forEach((address, index) => {
    assertNonEmptyString(address.fullText, `addresses[${index}].fullText`);
  });
  return addresses;
}

function parseSalesRecordProducts(
  products: SalesRecordProductInput[],
): SalesRecordProductInput[] {
  products.forEach((product, index) => {
    assertPositiveInt(product.productId, `products[${index}].productId`);
    assertPositiveInt(product.quantity, `products[${index}].quantity`);
  });
  return products;
}

export function parseSalesRecordId(recordId: number): number {
  return assertPositiveInt(recordId, "recordId");
}

export function parseSalesContactId(contactId: string): ContactId {
  assertNonEmptyString(contactId, "contactId");
  return asContactId(contactId);
}

export function parseCreateSalesRecordDraftInput(
  input: CreateSalesRecordDraftInput,
): CreateSalesRecordDraftInput {
  if (!isSalesRecordSource(input.source)) {
    throw validationError("source is invalid");
  }
  if (input.source === "lead_assignment") {
    if (!input.leadAssignmentId || !isAssignmentId(input.leadAssignmentId)) {
      throw validationError("leadAssignmentId is invalid or missing");
    }
  }
  if (input.source === "manual" && input.leadAssignmentId !== null) {
    throw validationError("leadAssignmentId must be null for manual sales");
  }

  return {
    ...input,
    addresses: parseSalesRecordAddresses(input.addresses),
    products: parseSalesRecordProducts(input.products),
  };
}

export function parseUpdateSalesRecordDraftInput(
  recordId: number,
  input: Omit<CreateSalesRecordDraftInput, "source" | "leadAssignmentId">,
  correctionNotes: string | null,
): {
  recordId: number;
  input: Omit<CreateSalesRecordDraftInput, "source" | "leadAssignmentId">;
  correctionNotes: string | null;
} {
  return {
    recordId: parseSalesRecordId(recordId),
    input: {
      ...input,
      addresses: parseSalesRecordAddresses(input.addresses),
      products: parseSalesRecordProducts(input.products),
    },
    correctionNotes:
      correctionNotes !== null && correctionNotes.trim().length > 0
        ? correctionNotes.trim()
        : null,
  };
}

export function parseRejectSalesRecordInput(
  recordId: number,
  reason: string,
): { recordId: number; reason: string } {
  return {
    recordId: parseSalesRecordId(recordId),
    reason: assertNonEmptyString(reason, "reason"),
  };
}

export function parseSalesRecordAttemptInput(
  recordId: number,
  outcome: string,
  notes: string | null,
  nextAttemptAt: number | null,
): RegisterSalesRecordAttemptInput {
  const safeRecordId = parseSalesRecordId(recordId);
  if (!isSalesRecordAttemptOutcome(outcome)) {
    throw validationError("outcome is invalid");
  }

  return {
    recordId: safeRecordId,
    outcome,
    notes,
    nextAttemptAt,
  };
}
