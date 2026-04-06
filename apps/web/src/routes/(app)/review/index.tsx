import { AppPage } from "~/components/layout/page";
import { ReviewRecordIndex } from "~/features/pipeline/record-index/review/adapter";

export default function ReviewQueuePage() {
  return (
    <AppPage>
      <ReviewRecordIndex />
    </AppPage>
  );
}
