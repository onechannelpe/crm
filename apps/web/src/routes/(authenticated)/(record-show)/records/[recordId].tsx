import { type RouteDefinition, useParams } from "@solidjs/router";

import { RecordShowPage } from "~/features/record-show/page/record-show-page";
import { leadDetailQuery } from "~/rpc/workflow/lead-detail";
import { leadListQuery } from "~/rpc/workflow/lead-list";

const LEAD_NAVIGATION_LIMIT = 200;

export const route = {
  preload: ({ params }) => {
    if (!params.recordId) {
      return;
    }

    void Promise.all([
      leadDetailQuery(params.recordId),
      leadListQuery({
        limit: LEAD_NAVIGATION_LIMIT,
        offset: 0,
      }),
    ]);
  },
} satisfies RouteDefinition;

export default function RecordShowRoute() {
  const params = useParams<{ recordId: string }>();

  return <RecordShowPage recordId={params.recordId} />;
}
