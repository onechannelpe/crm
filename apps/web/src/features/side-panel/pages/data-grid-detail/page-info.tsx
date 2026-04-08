import Info from "~/components/icons/info";

import { useSidePanelPageState } from "../../router/page-frame-context";
import { PageInfoLayout } from "../../top-bar/page-info-layout";

export function DataGridDetailPageInfo() {
  const pageState = useSidePanelPageState("data-grid-detail");

  return (
    <PageInfoLayout
      icon={<Info size={14} />}
      title={pageState().title}
      label={pageState().subtitle}
    />
  );
}
