import { composeExtension } from "~/server/extension/ui/composition";
import { toWire } from "~/server/platform/action/domain-error";
import { getRequestInstant } from "~/server/platform/http/request-context";
import { authorizeRoutePermission } from "~/server/platform/http/route-access";
import { isErr } from "~/shared/result";

export async function GET(): Promise<Response> {
  const auth = await authorizeRoutePermission("team:read");
  if (isErr(auth)) return auth.error;
  const session = auth.value;

  const { extensionService } = composeExtension();
  const result = await extensionService.listTeamExecutiveStatuses(
    {
      role: session.role,
      userId: session.userId,
      branchId: session.branchId,
    },
    getRequestInstant(),
  );
  if (isErr(result)) {
    return Response.json(
      { error: toWire(result.error).message },
      { status: 500 },
    );
  }

  return Response.json({ items: result.value }, { status: 200 });
}
