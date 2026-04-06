import { query } from "@solidjs/router";

import { getInventoryItems } from "~/actions/inventory/queries";

export const inventoryItemsQuery = query(getInventoryItems, "inventoryItems");
