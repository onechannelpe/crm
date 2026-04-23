import { useParams } from "@solidjs/router";

import { RecordShowPage } from "~/features/record-show/page/record-show-page";

export default function RecordShowRoute() {
  const params = useParams<{ recordId: string }>();
  return <RecordShowPage recordId={params.recordId} />;
}
