import { useNavigate } from "@solidjs/router";

import type { SaleRow } from "~/actions/pipeline/contracts/sales";
import { createRouteRowOpen } from "~/features/data-grid/model/row-open";

export function useOpenSalesRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<SaleRow>((sale) => {
      navigate(`/sales/${sale.id}`);
    }),
  };
}
