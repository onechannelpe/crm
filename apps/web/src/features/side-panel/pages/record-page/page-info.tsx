import Building2 from "~/components/icons/building-2";

import { PageInfoLayout } from "../../top-bar/page-info-layout";
import { useLeadRecordPageState } from "./state";

export function RecordPageInfo() {
  const { pageState, label } = useLeadRecordPageState();

  return (
    <PageInfoLayout
      icon={<Building2 size={14} />}
      title={pageState().title}
      label={label()}
    />
  );
}
