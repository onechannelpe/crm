import { AppPage } from "~/components/layout/page";
import { ReviewRecordIndex } from "~/features/record-index/adapters/review";

export default function ReviewQueuePage() {
  return (
    <AppPage>
      <ReviewRecordIndex />
    </AppPage>
  );
}
