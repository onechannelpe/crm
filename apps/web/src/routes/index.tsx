import { Navigate } from "@solidjs/router";
import { createResource } from "solid-js";

import { getMe } from "~/actions/auth-session";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";

export default function Index() {
  const [user] = createResource(getMe);
  return (
    <Navigate href={user() ? getDefaultAppPath(user()!.role) : "/login"} />
  );
}
