import { useNavigate } from "@solidjs/router";

import { createRouteRowOpen } from "~/features/data-grid/model/row-open";
import type { LeadListRowView } from "~/server/pipeline/application/queries/views/lead-list";

export function useOpenQuotationRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<LeadListRowView>((lead) => {
      navigate(`/quotations/${lead.id}`);
    }),
  };
}
