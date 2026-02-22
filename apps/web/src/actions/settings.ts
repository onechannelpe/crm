"use server";

import { requirePermission, requireSession } from "~/lib/auth/access/session";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";
import type { ProductUpdatedChanges } from "~/lib/contracts/audit";
import { serializeAuditChanges } from "~/lib/contracts/audit";
import type { ActionSuccess } from "~/lib/contracts/common";
import {
  assertBoolean,
  assertFinitePositive,
  assertNonEmptyString,
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
  if (!product) throw new Error("Product not found");

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

export async function updateUserProfile(
  fullName: string,
  phone: string,
): Promise<ActionSuccess> {
  const safeName = assertNonEmptyString(fullName, "fullName");
  const safePhone = assertNonEmptyString(phone, "phone");
  const session = await requireSession();

  await repos.users.updateProfile(session.userId, {
    full_name: safeName,
    phone: safePhone,
  });

  return { success: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionSuccess> {
  const safeCurrent = assertNonEmptyString(currentPassword, "currentPassword");
  const safeNew = assertNonEmptyString(newPassword, "newPassword");
  const session = await requireSession();

  const user = await repos.users.findById(session.userId);
  if (!user) throw new Error("User not found");

  const { verifyPassword } = await import("~/lib/auth/password/password");
  const valid = await verifyPassword(user.password_hash, safeCurrent);
  if (!valid) throw new Error("Current password is incorrect");

  const { hashPassword } = await import("~/lib/auth/password/password");
  const newHash = await hashPassword(safeNew);
  await repos.users.updatePassword(session.userId, newHash);

  await repos.auditLogs.create({
    user_id: session.userId,
    action: "password_changed",
    entity_type: "user",
    entity_id: session.userId,
    changes: null,
    created_at: Date.now(),
  });

  return { success: true };
}

