import { useNavigate } from "@solidjs/router";

import type { SalesListRow } from "~/actions/pipeline/queries/sales";
import { createRouteRowOpen } from "~/features/data-grid/model/row-open";

export function useOpenSalesRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<SalesListRow>((sale) => {
      navigate(`/sales/${sale.id}`);
    }),
  };
}
