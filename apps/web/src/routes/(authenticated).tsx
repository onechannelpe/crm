import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";

import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { meQuery } from "~/rpc/auth/me";

export const route = {
  preload: () => meQuery(),
} satisfies RouteDefinition;

export default function AuthenticatedLayout(props: RouteSectionProps) {
  return <AuthenticatedAppFrame>{props.children}</AuthenticatedAppFrame>;
}
