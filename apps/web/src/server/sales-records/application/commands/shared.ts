import { createAuditService } from "~/server/shared/audit";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { canTransitionSalesRecord } from "../../domain/workflow";
import type {
  ContactAssignmentRepository,
} from "../ports/contact-assignment-repository";
import type { SalesRecordAuditLogPort } from "../ports/audit-service";
import type { ProductRepository, SalesProductRecord } from "../ports/product-repository";
import type {
  SalesRecordRepository,
} from "../ports/sales-record-repository";
import type {
  SalesRecordAddressInput,
  SalesRecordProductInput,
  UpdateSalesRecordDraftInput,
} from "./types/draft-input";

export type SalesRecordCommandRepos = {
  auditLogs: SalesRecordAuditLogPort;
  contactAssignments: ContactAssignmentRepository;
  products: ProductRepository;
  salesRecords: SalesRecordRepository;
};

export type RepositoryTransactionRunner = <T>(
  operation: (repos: SalesRecordCommandRepos) => Promise<T>,
) => Promise<T>;

export type SalesRecordMutationDeps = {
  repos: SalesRecordCommandRepos;
  runInTransaction: RepositoryTransactionRunner;
};

export function okCommandResult(): Result<{ success: true }, never> {
  return Ok({ success: true as const });
}

export function salesRecordFailure(
  code: string,
  message: string,
): Result<never, DomainError> {
  switch (code) {
    case "not_found":
      return Err(domainError("not_found", code, message));
    case "forbidden":
      return Err(domainError("forbidden", code, message));
    case "invalid_data":
      return Err(domainError("validation", code, message));
    case "invalid_state":
      return Err(domainError("conflict", code, message));
    default:
      return Err(domainError("unexpected", "unexpected", message));
  }
}

export async function runSalesRecordMutation<T>(
  deps: SalesRecordMutationDeps,
  operation: (repos: SalesRecordCommandRepos) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await deps.runInTransaction(operation);
  } catch {
    return salesRecordFailure(
      "unexpected",
      "Unexpected sales records workflow failure",
    );
  }
}

export function getSalesRecordAudit(repos: SalesRecordCommandRepos) {
  return createAuditService(repos);
}

export function validateDraftPayload(input: {
  addresses: SalesRecordAddressInput[];
  products: SalesRecordProductInput[];
}): Result<void, DomainError> {
  if (input.addresses.length > 0) {
    const primaryCount = input.addresses.filter((it) => it.isPrimary).length;
    if (primaryCount !== 1) {
      return salesRecordFailure(
        "invalid_data",
        "Exactly one primary address is required",
      );
    }
  }
  if (input.products.some((it) => it.quantity < 1)) {
    return salesRecordFailure(
      "invalid_data",
      "All product quantities must be positive",
    );
  }
  return Ok(undefined);
}

export async function loadProducts(
  repos: SalesRecordCommandRepos,
  lines: SalesRecordProductInput[],
): Promise<Result<SalesProductRecord[], DomainError>> {
  const products = await Promise.all(
    lines.map((item) => repos.products.findById(item.productId)),
  );
  const resolvedProducts: SalesProductRecord[] = [];
  for (const product of products) {
    if (!product) {
      return salesRecordFailure(
        "not_found",
        "One or more products do not exist",
      );
    }
    resolvedProducts.push(product);
  }
  return Ok(resolvedProducts);
}

export async function persistDraftState(params: {
  repos: SalesRecordCommandRepos;
  recordId: number;
  input: UpdateSalesRecordDraftInput;
  products: SalesProductRecord[];
  now: number;
}): Promise<void> {
  await params.repos.salesRecords.upsertClient({
    sales_record_id: params.recordId,
    ruc: params.input.client.ruc,
    company_name: params.input.client.companyName,
    contact_name: params.input.client.contactName,
    dni: params.input.client.dni,
    phones_json: JSON.stringify(params.input.client.phones),
    engine_match_id: params.input.client.engineMatchId,
    completeness_score: params.input.client.completenessScore,
    created_at: params.now,
    updated_at: params.now,
  });
  await params.repos.salesRecords.replaceAddresses(
    params.recordId,
    params.input.addresses.map((address) => ({
      sales_record_id: params.recordId,
      address_type: address.addressType,
      full_text: address.fullText,
      department: address.department,
      province: address.province,
      district: address.district,
      ubigeo: address.ubigeo,
      latitude: address.latitude,
      longitude: address.longitude,
      is_primary: address.isPrimary ? 1 : 0,
      created_at: params.now,
      updated_at: params.now,
    })),
  );
  await params.repos.salesRecords.replaceProducts(
    params.recordId,
    params.input.products.map((line, index) => ({
      sales_record_id: params.recordId,
      product_id: line.productId,
      product_name_snapshot: params.products[index].name,
      category_snapshot: params.products[index].category,
      subtype_snapshot: params.products[index].subtype,
      quantity: line.quantity,
      unit_price_snapshot: params.products[index].price,
      created_at: params.now,
    })),
  );
}

export function assertTransition(
  from: Parameters<typeof canTransitionSalesRecord>[0],
  to: Parameters<typeof canTransitionSalesRecord>[1],
  action: string,
): Result<void, DomainError> {
  if (!canTransitionSalesRecord(from, to)) {
    return salesRecordFailure(
      "invalid_state",
      `Cannot ${action} from status: ${from}`,
    );
  }
  return Ok(undefined);
}
