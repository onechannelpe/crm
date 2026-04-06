import { useNavigate } from "@solidjs/router";

import type { LeadListRowView } from "~/actions/pipeline/queries/leads";
import { createRouteRowOpen } from "~/features/data-grid/model/row-open";

export function useOpenQuotationRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<LeadListRowView>((lead) => {
      navigate(`/quotations/${lead.id}`);
    }),
  };
}
