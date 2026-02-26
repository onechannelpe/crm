import { query } from "@solidjs/router";

import { getInventoryItems } from "~/actions/inventory";

export const inventoryItemsQuery = query(getInventoryItems, "inventoryItems");
