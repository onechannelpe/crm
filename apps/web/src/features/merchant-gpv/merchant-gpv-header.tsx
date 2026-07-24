import { type ParentProps } from "solid-js";

import LayoutDashboard from "~/components/icons/layout-dashboard";
import { TintedIconTile } from "~/components/ui/display/tinted-icon-tile/tinted-icon-tile";
import { PageCardHeader } from "~/components/ui/layout/page-card/page-card-header";

export function MerchantGpvHeader(props: ParentProps<{ title: string }>) {
  return (
    <PageCardHeader
      icon={<TintedIconTile Icon={LayoutDashboard} color="blue" />}
      title={props.title}
      actionButton={props.children}
    />
  );
}
