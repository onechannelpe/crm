import type { APIEvent } from "@solidjs/start/server";

import { gpvSnapshotTopic } from "~/contracts/merchant-stats/imports";
import { hasPermission } from "~/domain/auth/access/rbac";
import { GpvSnapshotJobId } from "~/domain/ids";
import { getSession } from "~/server/platform/action/session";
import { getServerRuntime } from "~/server/platform/container";
import { openTopicStream } from "~/server/realtime/sse-topic-stream";
import { isErr } from "~/shared/result";

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
  const imports = getServerRuntime().merchantStats.imports;
  const job = await imports.progress(jobId);

  if (!job) {
    return new Response("Not found", { status: 404 });
  }

  await imports.realtime.ensure();

  const stream = await openTopicStream(
    event.nativeEvent,
    imports.realtime.hub,
    gpvSnapshotTopic.of(jobId),
    {
      snapshot: () => imports.snapshotValue(jobId),
    },
  );

  return stream.send();
}
