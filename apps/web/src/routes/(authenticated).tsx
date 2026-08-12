import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";

import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { meQuery } from "~/rpc/auth/me";

export const route = {
  preload: () => meQuery(),
} satisfies RouteDefinition;

/*
  Every signed-in route nests here so the navigation drawer, the side panel and
  the session live on one component instance. Mounting the frame per route group
  instead would remount it on each cross-group navigation, dropping whatever the
  side panel had open.
*/
export default function AuthenticatedLayout(props: RouteSectionProps) {
  return <AuthenticatedAppFrame>{props.children}</AuthenticatedAppFrame>;
}
