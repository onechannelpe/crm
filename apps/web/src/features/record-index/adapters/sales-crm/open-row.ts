import { useNavigate } from "@solidjs/router";

import { createRouteRowOpen } from "~/features/data-grid";

import type { SalesCrmRow } from "./columns";

export function useOpenSalesCrmRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<SalesCrmRow>((sale) => {
      void navigate(`/sales/${sale.id}`);
    }),
  };
}
