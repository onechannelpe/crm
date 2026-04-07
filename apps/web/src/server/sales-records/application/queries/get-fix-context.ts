import { assertOwnedRecord } from "~/lib/auth/access/ownership";
import type { AppContext } from "~/server/shared/action-runtime";

import type { SalesRecordReadContext } from "../../infrastructure/read-context";
import type { SalesRecordFixContextView } from "../contracts";

function parsePhonesJson(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export async function getFixContext(
  ctx: AppContext,
  deps: SalesRecordReadContext,
  input: { recordId: number },
): Promise<SalesRecordFixContextView> {
  const record = assertOwnedRecord(
    await deps.repos.salesRecords.findById(input.recordId),
    (row) => row.executive_user_id,
    ctx.actor,
    { resourceName: "Sales record" },
  );

  const [client, addresses, products, attempts] = await Promise.all([
    deps.repos.salesRecords.findClientByRecord(input.recordId),
    deps.repos.salesRecords.findAddressesByRecord(input.recordId),
    deps.repos.salesRecords.findProductsByRecord(input.recordId),
    deps.repos.salesRecords.listAttemptsByRecord(input.recordId),
  ]);

  return {
    id: record.id,
    status: record.status,
    client: client
      ? {
          ruc: client.ruc,
          companyName: client.company_name,
          contactName: client.contact_name,
          dni: client.dni,
          phones: parsePhonesJson(client.phones_json),
        }
      : null,
    addresses: addresses.map((address) => ({
      id: address.id,
      addressType: address.address_type,
      fullText: address.full_text,
      isPrimary: address.is_primary,
    })),
    products: products.map((product) => ({
      id: product.product_id,
      productName: product.product_name_snapshot,
      quantity: product.quantity,
    })),
    attempts: attempts.map((attempt) => ({
      id: attempt.id,
      outcome: attempt.outcome,
      notes: attempt.notes,
      nextAttemptAt: attempt.next_attempt_at,
      createdAt: attempt.created_at,
      reviewerName: attempt.reviewer_name,
    })),
  };
}
