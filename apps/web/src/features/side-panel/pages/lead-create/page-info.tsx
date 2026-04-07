import Building2 from "~/components/icons/building-2";

import { PageInfoLayout } from "../../top-bar/page-info-layout";

export function LeadCreatePageInfo() {
  return (
    <PageInfoLayout
      icon={<Building2 size={14} />}
      title="Untitled"
      label="Created now"
    />
  );
}
