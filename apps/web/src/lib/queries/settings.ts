import { query } from "@solidjs/router";

import { getProductCatalog } from "~/actions/settings/admin-products";

export const productCatalogQuery = query(getProductCatalog, "productCatalog");
