import type { APIEvent } from "@solidjs/start/server";

import { gpvSnapshotTopic } from "~/contracts/merchant-stats/imports";
import { hasPermission } from "~/lib/auth/access/rbac";
import { getSession } from "~/lib/auth/access/session";
import {
  gpvSnapshotJobSnapshot,
  gpvSnapshotsRealtime,
} from "~/server/merchant-stats/snapshot/realtime";
import { createGpvSnapshotJobRepo } from "~/server/merchant-stats/snapshot/repo";
import { getServerRuntime } from "~/server/platform/container";
import { openTopicStream } from "~/server/realtime/sse-topic-stream";
import { GpvSnapshotJobId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

export async function GET(
  event: Pick<APIEvent, "params" | "nativeEvent">,
): Promise<Response | BodyInit> {
  const parsedJobId = GpvSnapshotJobId.parse(event.params.jobId);

  if (isErr(parsedJobId)) {
    return new Response("Invalid import", { status: 400 });
  }

  const session = await getSession();

  if (
    !session ||
    session.sessionClass !== "app" ||
    !hasPermission(session.role, "dashboards:read")
  ) {
    return new Response(null, { status: 401 });
  }

  const jobId = parsedJobId.value;
  const jobs = createGpvSnapshotJobRepo(getServerRuntime().infra.db);
  const job = await jobs.findById(jobId);

  if (!job) {
    return new Response("Not found", { status: 404 });
  }

  await gpvSnapshotsRealtime.ensure();

  const stream = await openTopicStream(
    event.nativeEvent,
    gpvSnapshotsRealtime.hub,
    gpvSnapshotTopic.of(jobId),
    {
      snapshot: () => gpvSnapshotJobSnapshot(jobId),
    },
  );

  return stream.send();
}
