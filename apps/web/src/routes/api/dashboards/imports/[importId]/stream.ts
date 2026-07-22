import type { APIEvent } from "@solidjs/start/server";

import { merchantReportTopic } from "~/features/dashboards/imports/contracts";
import { hasPermission } from "~/lib/auth/access/rbac";
import { getSession } from "~/lib/auth/access/session";
import {
  merchantReportSnapshot,
  merchantReportsRealtime,
} from "~/server/merchant-stats/report-import/realtime";
import { createMerchantReportImportRepo } from "~/server/merchant-stats/report-import/repo";
import { getServerRuntime } from "~/server/platform/container";
import { openTopicStream } from "~/server/realtime/sse-topic-stream";
import { MerchantReportImportId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

export async function GET(
  event: Pick<APIEvent, "params" | "nativeEvent">,
): Promise<Response | BodyInit> {
  const parsedImportId = MerchantReportImportId.parse(event.params.importId);

  if (isErr(parsedImportId)) {
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

  const importId = parsedImportId.value;
  const imports = createMerchantReportImportRepo(getServerRuntime().infra.db);
  const job = await imports.findById(importId);

  if (!job) {
    return new Response("Not found", { status: 404 });
  }

  await merchantReportsRealtime.ensure();

  const stream = await openTopicStream(
    event.nativeEvent,
    merchantReportsRealtime.hub,
    merchantReportTopic.of(importId),
    {
      snapshot: () => merchantReportSnapshot(importId),
    },
  );

  return stream.send();
}
