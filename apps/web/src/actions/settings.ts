"use server";

import { requirePermission } from "~/lib/auth/session";
import { repos } from "~/server/shared/context";

export async function getProductCatalog() {
    await requirePermission("admin:manage");
    return repos.products.findAll();
}

export async function updateProductPricing(productId: number, price: number, isActive: boolean) {
    const session = await requirePermission("admin:manage");
    if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Price must be greater than 0");
    }

    const product = await repos.products.findById(productId);
    if (!product) throw new Error("Product not found");

    await repos.products.update(productId, { price, is_active: isActive ? 1 : 0 });
    await repos.auditLogs.create({
        user_id: session.userId,
        action: "product_updated",
        entity_type: "product",
        entity_id: productId,
        changes: JSON.stringify({ previous: { price: product.price, is_active: product.is_active }, next: { price, is_active: isActive ? 1 : 0 } }),
        created_at: Date.now(),
    });

    return { success: true };
}
