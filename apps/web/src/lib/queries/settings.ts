import { query } from "@solidjs/router";

import { getProductCatalog } from "~/actions/settings";

export const productCatalogQuery = query(getProductCatalog, "productCatalog");
