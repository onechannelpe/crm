export interface CatalogProductDraft {
  price: string;
  isActive: boolean;
}

export interface CatalogProductRecord {
  id: number;
  price: number;
  is_active: number;
}

export interface PendingCatalogChange {
  id: number;
  price: number;
  isActive: boolean;
}

export type PendingCatalogChangesResult =
  | { ok: true; changes: PendingCatalogChange[] }
  | { ok: false; reason: "invalid-price" };

export interface CatalogSaveSummary {
  successfulIds: number[];
  firstError?: unknown;
  status: "all-success" | "partial-failure" | "all-failure";
}

export function collectPendingCatalogChanges(args: {
  products: CatalogProductRecord[];
  drafts: Record<number, CatalogProductDraft>;
  dirtyIds: number[];
}): PendingCatalogChangesResult {
  const productsById = new Map(
    args.products.map((product) => [product.id, product]),
  );
  const changes: PendingCatalogChange[] = [];

  for (const id of args.dirtyIds) {
    const product = productsById.get(id);
    const draft = args.drafts[id];

    if (!product || !draft) {
      continue;
    }

    const parsedPrice = Number(draft.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return { ok: false, reason: "invalid-price" };
    }

    changes.push({
      id,
      price: parsedPrice,
      isActive: draft.isActive,
    });
  }

  return { ok: true, changes };
}

export function summarizeCatalogSaveResults(
  changes: PendingCatalogChange[],
  results: PromiseSettledResult<unknown>[],
): CatalogSaveSummary {
  const successfulIds: number[] = [];
  let firstError: unknown;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successfulIds.push(changes[index].id);
      return;
    }

    firstError ??= result.reason;
  });

  if (successfulIds.length === changes.length) {
    return { successfulIds, status: "all-success" };
  }

  if (successfulIds.length === 0) {
    return { successfulIds, firstError, status: "all-failure" };
  }

  return { successfulIds, firstError, status: "partial-failure" };
}
