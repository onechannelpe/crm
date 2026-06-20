import { authorizeRoutePermission } from "~/lib/auth/access/route-access";
import { getServerRuntime } from "~/server/runtime";
import { toWire } from "~/server/shared/domain-error";
import { isErr } from "~/server/shared/result";

export async function GET(): Promise<Response> {
  const auth = await authorizeRoutePermission("team:read");
  if (isErr(auth)) return auth.error;
  const session = auth.value;

  const { extensionService } = getServerRuntime().extension;
  const result = await extensionService.listTeamExecutiveStatuses({
    role: session.role,
    userId: session.userId,
    branchId: session.branchId,
  });
  if (isErr(result)) {
    return Response.json(
      { error: toWire(result.error).message },
      { status: 500 },
    );
  }

  return Response.json({ items: result.value }, { status: 200 });
}
