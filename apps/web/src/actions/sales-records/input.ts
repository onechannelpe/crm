import { validationError } from "~/lib/app-errors";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import type {
  CreateSalesRecordDraftInput,
  SalesRecordAddressInput,
  SalesRecordAttemptOutcome,
  SalesRecordProductInput,
  SalesRecordSource,
} from "~/server/sales-records/domain/types";

function isSalesRecordSource(value: string): value is SalesRecordSource {
  return value === "lead_assignment" || value === "manual";
}

function isSalesRecordAttemptOutcome(
  value: string,
): value is SalesRecordAttemptOutcome {
  return (
    value === "no_answer" ||
    value === "callback_scheduled" ||
    value === "validated" ||
    value === "invalid_data" ||
    value === "rejected"
  );
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

export function parseSalesContactId(contactId: number): number {
  return assertPositiveInt(contactId, "contactId");
}

export function parseCreateSalesRecordDraftInput(
  input: CreateSalesRecordDraftInput,
): CreateSalesRecordDraftInput {
  if (!isSalesRecordSource(input.source)) {
    throw validationError("source is invalid");
  }
  if (input.source === "lead_assignment") {
    assertPositiveInt(input.leadAssignmentId ?? 0, "leadAssignmentId");
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
): {
  recordId: number;
  outcome: SalesRecordAttemptOutcome;
  notes: string | null;
  nextAttemptAt: number | null;
} {
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
