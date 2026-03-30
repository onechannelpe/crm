import { useNavigate } from "@solidjs/router";

import { createRouteRowOpen } from "~/features/data-grid";

import type { SalesRow } from "./columns";

export function useOpenSalesRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<SalesRow>((sale) => {
      navigate(`/sales/${sale.id}`);
    }),
  };
}
