import { useNavigate } from "@solidjs/router";

import type { LeadListRow } from "~/actions/pipeline/queries/leads";
import { createRouteRowOpen } from "~/features/data-grid/model/row-open";

export function useOpenReviewRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<LeadListRow>((lead) => {
      navigate(`/review/${lead.id}`);
    }),
  };
}
