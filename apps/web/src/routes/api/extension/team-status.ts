import { requirePermission } from "~/lib/auth/access/session";
import { serverRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";

export async function GET(): Promise<Response> {
  try {
    const { extensionService } = serverRuntime.extension;
    const session = await requirePermission("team:read");
    const result = await extensionService.listTeamExecutiveStatuses({
      role: session.role,
      userId: session.userId,
      branchId: session.branchId,
    });
    if (isErr(result)) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    return Response.json({ items: result.value }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response("Unauthorized", { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return new Response("Forbidden", { status: 403 });
    }

    return new Response("Unexpected error", { status: 500 });
  }
}
