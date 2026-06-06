import { type RouteDefinition, useParams } from "@solidjs/router";

import { RecordShowPage } from "~/features/record-show/page/record-show-page";
import { leadDetailQuery } from "~/features/workflow/data/queries";

// Warm the lead detail on the server so the record page streams with data instead
// of fetching on mount.
export const route = {
  preload: ({ params }) => {
    if (params.recordId) {
      void leadDetailQuery(params.recordId);
    }
  },
} satisfies RouteDefinition;

export default function RecordShowRoute() {
  const params = useParams<{ recordId: string }>();
  return <RecordShowPage recordId={params.recordId} />;
}
