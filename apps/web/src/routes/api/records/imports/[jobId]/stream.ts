import type { APIEvent } from "@solidjs/start/server";

import { recordImportTopic } from "~/contracts/records/imports";
import { hasPermission } from "~/lib/auth/access/rbac";
import { getSession } from "~/lib/auth/access/session";
import { getServerRuntime } from "~/server/platform/container";
import { openTopicStream } from "~/server/realtime/sse-topic-stream";
import { canAccessRecordImportJob } from "~/server/records/imports/api";
import {
  recordImportSnapshot,
  recordImportsRealtime,
} from "~/server/records/imports/realtime";
import { IntegrationJobId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

export async function GET(
  event: Pick<APIEvent, "params" | "nativeEvent">,
): Promise<Response | BodyInit> {
  const parsedJobId = IntegrationJobId.parse(event.params.jobId);

  if (isErr(parsedJobId)) {
    return new Response("Invalid job", { status: 400 });
  }

  const session = await getSession();

  if (
    !session ||
    session.sessionClass !== "app" ||
    !hasPermission(session.role, "integration:manage")
  ) {
    return new Response(null, { status: 401 });
  }

  const jobId = parsedJobId.value;
  const { integration } = getServerRuntime().integrations;
  const job = await integration.jobs.findById(jobId);

  if (!job) {
    return new Response("Not found", { status: 404 });
  }

  const canAccess = await canAccessRecordImportJob(session, job, integration);

  if (!canAccess) {
    return new Response("Not found", { status: 404 });
  }

  await recordImportsRealtime.ensure();

  const stream = await openTopicStream(
    event.nativeEvent,
    recordImportsRealtime.hub,
    recordImportTopic.of(jobId),
    {
      snapshot: () => recordImportSnapshot(jobId),
    },
  );

  return stream.send();
}
