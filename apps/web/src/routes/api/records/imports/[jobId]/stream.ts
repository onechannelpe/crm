import type { APIEvent } from "@solidjs/start/server";

import { recordImportTopic } from "~/contracts/records/imports";
import { hasPermission } from "~/domain/auth/access/rbac";
import { IntegrationJobId } from "~/domain/ids";
import { composeIntegrations } from "~/server/integrations/ui/composition";
import { getSession } from "~/server/platform/action/session";
import { openTopicStream } from "~/server/realtime/sse-topic-stream";
import { canAccessRecordImportJob } from "~/server/records/imports/api";
import { recordImportSnapshot } from "~/server/records/imports/realtime";
import { composeRecordsImportRealtime } from "~/server/records/imports/ui/realtime-composition";
import { isErr } from "~/shared/result";

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
  const { integration } = composeIntegrations();
  const job = await integration.jobs.findById(jobId);

  if (!job) {
    return new Response("Not found", { status: 404 });
  }

  const canAccess = await canAccessRecordImportJob(session, job, integration);

  if (!canAccess) {
    return new Response("Not found", { status: 404 });
  }

  await composeRecordsImportRealtime().ensure();

  const stream = await openTopicStream(
    event.nativeEvent,
    composeRecordsImportRealtime().hub,
    recordImportTopic.of(jobId),
    {
      snapshot: () => recordImportSnapshot(jobId, integration.jobs),
    },
  );

  return stream.send();
}
