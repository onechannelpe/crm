import { useNavigate } from "@solidjs/router";

import { createRouteRowOpen } from "~/features/data-grid/model/row-open";
import type { LeadListRowView } from "~/server/pipeline/application/contracts";

export function useOpenReviewRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<LeadListRowView>((lead) => {
      navigate(`/review/${lead.id}`);
    }),
  };
}
