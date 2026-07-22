import type { APIEvent } from "@solidjs/start/server";

import { merchantReportTopic } from "~/features/dashboards/imports/contracts";
import { hasPermission } from "~/lib/auth/access/rbac";
import { getSession } from "~/lib/auth/access/session";
import {
  buildMerchantReportProgressEvent,
  findMerchantReportImport,
} from "~/server/merchant-stats/report-import/progress";
import { merchantReportsRealtime } from "~/server/merchant-stats/report-import/realtime";
import { getServerRuntime } from "~/server/platform/container";
import { openTopicStream } from "~/server/realtime/sse-topic-stream";

export async function GET(
  event: Pick<APIEvent, "params" | "nativeEvent">,
): Promise<Response | BodyInit> {
  const importId = event.params.importId;

  if (!importId) {
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

  const db = getServerRuntime().infra.db;
  const job = await findMerchantReportImport(db, importId);

  if (!job) {
    return new Response("Not found", { status: 404 });
  }

  await merchantReportsRealtime.ensure();

  const stream = await openTopicStream(
    event.nativeEvent,
    merchantReportsRealtime.hub,
    merchantReportTopic.of(importId),
    {
      snapshot: JSON.stringify(buildMerchantReportProgressEvent(job)),
    },
  );

  return stream.send();
}
