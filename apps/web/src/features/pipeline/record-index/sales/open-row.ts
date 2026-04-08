import { useNavigate } from "@solidjs/router";

import { createRouteRowOpen } from "~/features/data-grid/model/row-open";
import type { SaleView } from "~/server/pipeline/application/queries/views/sale";

export function useOpenSalesRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<SaleView>((sale) => {
      navigate(`/sales/${sale.id}`);
    }),
  };
}
