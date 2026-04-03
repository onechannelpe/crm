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
import { db } from "~/lib/db/db";
import { createProductsRepo } from "~/server/inventory/repos-products";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

const products = createProductsRepo(db);
const auditLogs = createAuditLogsRepo(db);

type ProductCatalogItem = Awaited<ReturnType<typeof products.findAll>>[number];

function parseUpdateProductPricingInput(input: {
  productId: number;
  price: number;
  isActive: boolean;
}): { productId: number; price: number; isActive: boolean } {
  return {
    productId: assertPositiveInt(input.productId, "productId"),
    price: assertFinitePositive(input.price, "price"),
    isActive: assertBoolean(input.isActive, "isActive"),
  };
}

export async function getProductCatalog(): Promise<ProductCatalogItem[]> {
  await requirePermission("admin:manage");
  return products.findAll();
}

export async function updateProductPricing(
  productId: number,
  price: number,
  isActive: boolean,
): Promise<ActionSuccess> {
  const parsedInput = parseUpdateProductPricingInput({
    productId,
    price,
    isActive,
  });
  const session = await requirePermission("admin:manage");
  assertRecentStrongAuth(session);
  const product = await products.findById(parsedInput.productId);
  if (!product) throw notFoundError("Product not found");

  await products.update(parsedInput.productId, {
    price: parsedInput.price,
    is_active: parsedInput.isActive ? 1 : 0,
  });
  const changes: ProductUpdatedChanges = {
    previous: { price: product.price, is_active: product.is_active },
    next: {
      price: parsedInput.price,
      is_active: parsedInput.isActive ? 1 : 0,
    },
  };
  await auditLogs.create({
    user_id: session.userId,
    action: "product_updated",
    entity_type: "product",
    entity_id: parsedInput.productId,
    changes: serializeAuditChanges(changes),
    created_at: Date.now(),
  });

  return { success: true };
}
