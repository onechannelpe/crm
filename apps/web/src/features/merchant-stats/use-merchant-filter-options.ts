import { createAsync } from "@solidjs/router";
import type { Accessor } from "solid-js";

import type { FilterOptions } from "~/contracts/merchant-stats/views";
import { merchantFilterOptionsQuery } from "~/rpc/merchant-stats/merchant-filter-options";

const EMPTY_OPTIONS: FilterOptions = {
  branches: [],
  sellers: [],
  months: [],
  products: [],
};

export function useMerchantFilterOptions(): Accessor<FilterOptions> {
  const options = createAsync(() => merchantFilterOptionsQuery());
  return () => options() ?? EMPTY_OPTIONS;
}
