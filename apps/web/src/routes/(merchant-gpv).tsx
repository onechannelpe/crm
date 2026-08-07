import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";

import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { MerchantGpvShell } from "~/components/layout/app-shell/merchant-gpv-shell";
import { meQuery } from "~/rpc/auth/me";

export const route = {
  preload: () => meQuery(),
} satisfies RouteDefinition;

export default function MerchantGpvLayout(props: RouteSectionProps) {
  return (
    <AuthenticatedAppFrame>
      <MerchantGpvShell {...props} />
    </AuthenticatedAppFrame>
  );
}
