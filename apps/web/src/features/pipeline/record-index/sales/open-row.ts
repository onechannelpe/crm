import { useNavigate } from "@solidjs/router";

import type { SaleView } from "~/actions/pipeline/queries/sales";
import { createRouteRowOpen } from "~/features/data-grid/model/row-open";

export function useOpenSalesRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<SaleView>((sale) => {
      navigate(`/sales/${sale.id}`);
    }),
  };
}
