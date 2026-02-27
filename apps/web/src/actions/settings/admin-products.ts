"use server";

import { notFoundError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";
import type { ProductUpdatedChanges } from "~/lib/contracts/audit";
import { serializeAuditChanges } from "~/lib/contracts/audit";
import type { ActionSuccess } from "~/lib/contracts/common";
import {
  assertBoolean,
  assertFinitePositive,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

type ProductCatalogItem = Awaited<
  ReturnType<typeof repos.products.findAll>
>[number];

export async function getProductCatalog(): Promise<ProductCatalogItem[]> {
  await requirePermission("admin:manage");
  return repos.products.findAll();
}

export async function updateProductPricing(
  productId: number,
  price: number,
  isActive: boolean,
): Promise<ActionSuccess> {
  const safeProductId = assertPositiveInt(productId, "productId");
  const safePrice = assertFinitePositive(price, "price");
  const safeIsActive = assertBoolean(isActive, "isActive");
  const session = await requirePermission("admin:manage");
  assertRecentStrongAuth(session);
  const product = await repos.products.findById(safeProductId);
  if (!product) throw notFoundError("Product not found");

  await repos.products.update(safeProductId, {
    price: safePrice,
    is_active: safeIsActive ? 1 : 0,
  });
  const changes: ProductUpdatedChanges = {
    previous: { price: product.price, is_active: product.is_active },
    next: { price: safePrice, is_active: safeIsActive ? 1 : 0 },
  };
  await repos.auditLogs.create({
    user_id: session.userId,
    action: "product_updated",
    entity_type: "product",
    entity_id: safeProductId,
    changes: serializeAuditChanges(changes),
    created_at: Date.now(),
  });

  return { success: true };
}
