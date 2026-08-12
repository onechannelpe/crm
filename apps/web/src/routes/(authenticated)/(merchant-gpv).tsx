import type { RouteSectionProps } from "@solidjs/router";

import { MerchantGpvShell } from "~/components/layout/app-shell/merchant-gpv-shell";

export default function MerchantGpvLayout(props: RouteSectionProps) {
  return <MerchantGpvShell {...props} />;
}
