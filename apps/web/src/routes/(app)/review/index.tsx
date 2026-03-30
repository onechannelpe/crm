import { AppPage } from "~/components/layout/page";
import { ReviewRecordIndex } from "~/features/record-index/adapters/review/adapter";

export default function ReviewQueuePage() {
  return (
    <AppPage>
      <ReviewRecordIndex />
    </AppPage>
  );
}
