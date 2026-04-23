import { useParams } from "@solidjs/router";

import { RecordShowPage } from "~/features/record-show/page/record-show-page";

export default function LeadRecordShowRoute() {
  const params = useParams<{ leadId: string }>();
  return <RecordShowPage leadId={params.leadId} />;
}
