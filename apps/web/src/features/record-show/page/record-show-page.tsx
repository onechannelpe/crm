import { createAsync, revalidate } from "@solidjs/router";
import { Show } from "solid-js";

import { createRecordPageController } from "~/features/record-show/record-page-controller";
import { leadDetailQuery } from "~/features/workflow/data/lead-detail.query";
import { leadListQuery } from "~/features/workflow/data/lead-list.query";

import { RecordLeftPanel } from "../panels/record-left-panel";
import { RecordRightPanel } from "../panels/record-right-panel";

import styles from "./record-show-page.module.css";

type RecordShowPageProps = {
  recordId: string;
};

const POLL_INTERVAL_MS = 3_500;
const POLL_TIMEOUT_MS = 60_000;

export function RecordShowPage(props: RecordShowPageProps) {
  const data = createAsync(() => leadDetailQuery(props.recordId));

  createRecordPageController({
    leadId: () => props.recordId,
    detailData: data,
    pollIntervalMs: POLL_INTERVAL_MS,
    pollTimeoutMs: POLL_TIMEOUT_MS,
    revalidateLeadDetail: async (currentLeadId) => {
      await revalidate(leadDetailQuery.keyFor(currentLeadId));
    },
    revalidateLeadList: async () => {
      await revalidate(leadListQuery.key);
    },
  });

  return (
    <Show when={data()}>
      {(detail) => (
        <div class={styles.layout}>
          <RecordLeftPanel data={detail()} evaluatedAt={detail().evaluatedAt} />
          <RecordRightPanel data={detail()} />
        </div>
      )}
    </Show>
  );
}
