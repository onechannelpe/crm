import { createEffect, createMemo, type Accessor } from "solid-js";

import { createPollingController } from "../../core/polling/create-polling-controller";

const POLLING_STATUSES = new Set(["queued", "running"]);

type RecordPageControllerInput = {
  leadId: Accessor<string>;
  detailData: Accessor<
    { sourceStatus: { sunat: { status: string } } } | undefined
  >;
  pollIntervalMs: number;
  pollTimeoutMs: number;
  revalidateLeadDetail: (leadId: string) => Promise<void>;
  revalidateLeadList: () => Promise<void>;
};

export function createRecordPageController(input: RecordPageControllerInput) {
  const sunatStatus = createMemo(
    () => input.detailData()?.sourceStatus.sunat.status,
  );

  const poller = createPollingController({
    intervalMs: input.pollIntervalMs,
    timeoutMs: input.pollTimeoutMs,
    shouldContinue: () => {
      const status = sunatStatus();
      return status !== undefined && POLLING_STATUSES.has(status);
    },
    runOnce: async () => {
      await input.revalidateLeadDetail(input.leadId());
    },
  });

  let previousStatus: string | undefined;

  createEffect(() => {
    const status = sunatStatus();
    if (!status) {
      poller.stop();
      previousStatus = status;
      return;
    }

    const wasPolling = previousStatus
      ? POLLING_STATUSES.has(previousStatus)
      : false;
    const isPolling = POLLING_STATUSES.has(status);

    if (wasPolling && !isPolling) {
      void input.revalidateLeadList();
    }

    if (isPolling) {
      poller.start();
    } else {
      poller.stop();
    }

    previousStatus = status;
  });

  return {
    pollingState: poller.state,
  };
}
