"use server";

import { repos } from "~/server/shared/context";
import { requirePermission } from "~/lib/auth/session";

export async function getInventoryItems() {
    await requirePermission("inventory:read");

    return repos.inventory.findAllWithProduct();
}
