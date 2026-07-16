import type { APIEvent } from "@solidjs/start/server";

import { recordImportTopic } from "~/features/records-imports/contracts";
import { hasPermission } from "~/lib/auth/access/rbac";
import { getSession } from "~/lib/auth/access/session";
import { getServerRuntime } from "~/server/platform/container";
import { openTopicStream } from "~/server/realtime/sse-topic-stream";
import { canAccessRecordImportJob } from "~/server/records/imports/api";
import {
  buildRecordImportProgressEvent,
  findRecordImportJob,
} from "~/server/records/imports/progress-events";
import { recordImportsRealtime } from "~/server/records/imports/realtime";

export async function GET(
  event: Pick<APIEvent, "params" | "nativeEvent">,
): Promise<Response | BodyInit> {
  const jobId = event.params.jobId;
  if (!jobId) return new Response("Invalid job", { status: 400 });

  const session = await getSession();
  if (
    !session ||
    session.sessionClass !== "app" ||
    !hasPermission(session.role, "integration:manage")
  ) {
    return new Response(null, { status: 401 });
  }

  await recordImportsRealtime.ensure();

  const { integration } = getServerRuntime().integrations;
  const job = await findRecordImportJob(integration.jobs, jobId);
  if (!job) return new Response("Not found", { status: 404 });

  const canAccess = await canAccessRecordImportJob(
    { userId: session.userId, branchId: session.branchId, role: session.role },
    job,
    integration,
  );
  if (!canAccess) return new Response("Not found", { status: 404 });

  const stream = openTopicStream(
    event.nativeEvent,
    recordImportsRealtime.hub,
    recordImportTopic(jobId),
  );

  await stream.push(JSON.stringify(buildRecordImportProgressEvent({ job })));

  return stream.send();
}
