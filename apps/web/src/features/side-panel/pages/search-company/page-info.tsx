import Users from "~/components/icons/users";

import { useSidePanelPageState } from "../../router/page-frame-context";
import { PageInfoLayout } from "../../top-bar/page-info-layout";

export function SearchCompanyPageInfo() {
  const pageState = useSidePanelPageState("search-company-detail");

  return (
    <PageInfoLayout
      icon={<Users size={14} />}
      title={pageState().company.name ?? "Unknown company"}
      label={`Resultado de "${pageState().query}"`}
    />
  );
}
