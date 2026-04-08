import Building2 from "~/components/icons/building-2";

import { useSidePanelPageState } from "../../router/page-frame-context";
import { PageInfoLayout } from "../../top-bar/page-info-layout";

export function LeadDetailPageInfo() {
  const pageState = useSidePanelPageState("lead-detail");

  return (
    <PageInfoLayout
      icon={<Building2 size={14} />}
      title={pageState().title}
      label={pageState().subtitle}
    />
  );
}
