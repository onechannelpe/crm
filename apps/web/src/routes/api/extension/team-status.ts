import { getApplication } from "~/server/composition/application";
import { toWire } from "~/server/platform/action/domain-error";
import { getRequestOperation } from "~/server/platform/http/request-context-storage";
import { authorizeRoutePermission } from "~/server/platform/http/route-access";
import { isErr } from "~/shared/result";

export async function GET(): Promise<Response> {
  const auth = await authorizeRoutePermission("team:read");

  if (isErr(auth)) {
    return auth.error;
  }

  const { role, userId, branchId } = auth.value;

  const result = await getApplication().extension.listTeamExecutiveStatuses(
    {
      role,
      userId,
      branchId,
    },
    getRequestOperation(),
  );

  if (isErr(result)) {
    return Response.json(
      { error: toWire(result.error).message },
      { status: 500 },
    );
  }

  return Response.json({ items: result.value }, { status: 200 });
}
