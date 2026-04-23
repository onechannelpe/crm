import { createAsync, revalidate } from "@solidjs/router";
import { Show } from "solid-js";

import { createRecordPageController } from "~/features/side-panel/pages/record-page/controller";
import {
  leadDetailQuery,
  leadListQuery,
} from "~/features/workflow/data/queries";

import { RecordLeftPanel } from "../left-panel/record-left-panel";
import { RecordRightPanel } from "../right-panel/record-right-panel";

import styles from "./record-show-page.module.css";

type RecordShowPageProps = {
  leadId: string;
};

const POLL_INTERVAL_MS = 3_500;
const POLL_TIMEOUT_MS = 60_000;

export function RecordShowPage(props: RecordShowPageProps) {
  const data = createAsync(() => leadDetailQuery(props.leadId));

  createRecordPageController({
    leadId: () => props.leadId,
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
          <RecordLeftPanel data={detail()} />
          <RecordRightPanel data={detail()} />
        </div>
      )}
    </Show>
  );
}
