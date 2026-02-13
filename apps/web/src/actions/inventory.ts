"use server";

import { repos } from "~/server/shared/context";
import { requireAuth } from "~/lib/auth/session";

export async function getInventoryItems() {
    await requireAuth();

    return repos.inventory.findAllWithProduct();
}
