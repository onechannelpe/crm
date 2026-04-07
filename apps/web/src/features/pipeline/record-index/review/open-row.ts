import { useNavigate } from "@solidjs/router";

import type { LeadListRowView } from "~/actions/pipeline/contracts";
import { createRouteRowOpen } from "~/features/data-grid/model/row-open";

export function useOpenReviewRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<LeadListRowView>((lead) => {
      navigate(`/leads/${lead.id}`);
    }),
  };
}
