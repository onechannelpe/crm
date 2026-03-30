import { useNavigate } from "@solidjs/router";

import { createRouteRowOpen } from "~/features/data-grid";

import type { QuotationRow } from "./columns";

export function useOpenQuotationRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<QuotationRow>((lead) => {
      navigate(`/quotations/${lead.id}`);
    }),
  };
}
