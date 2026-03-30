import { useNavigate } from "@solidjs/router";

import { createRouteRowOpen } from "~/features/data-grid/model/row-open";

import type { ReviewRow } from "./columns";

export function useOpenReviewRecord() {
  const navigate = useNavigate();

  return {
    rowOpen: createRouteRowOpen<ReviewRow>((lead) => {
      navigate(`/review/${lead.id}`);
    }),
  };
}
