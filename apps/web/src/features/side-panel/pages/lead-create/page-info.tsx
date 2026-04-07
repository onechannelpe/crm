import Building2 from "~/components/icons/building-2";

import { PageInfoLayout } from "../../top-bar/page-info-layout";
import { useLeadCreatePageState } from "./state";

export function LeadCreatePageInfo() {
  const { title, label } = useLeadCreatePageState();

  return (
    <PageInfoLayout
      icon={<Building2 size={14} />}
      title={title()}
      label={label()}
    />
  );
}
