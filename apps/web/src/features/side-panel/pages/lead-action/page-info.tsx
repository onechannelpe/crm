import Building2 from "~/components/icons/building-2";

import { PageInfoLayout } from "../../top-bar/page-info-layout";
import { useLeadActionPageState } from "./state";

export function LeadActionPageInfo() {
  const { pageState } = useLeadActionPageState();

  return (
    <PageInfoLayout
      icon={<Building2 size={14} />}
      title={pageState().title}
      label={pageState().subtitle}
    />
  );
}
