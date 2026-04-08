import User from "~/components/icons/user";

import { useSidePanelPageState } from "../../state/page-frame";
import { PageInfoLayout } from "../../top-bar/page-info-layout";

export function SearchPersonPageInfo() {
  const pageState = useSidePanelPageState("search-person-detail");

  return (
    <PageInfoLayout
      icon={<User size={14} />}
      title={pageState().person.displayName}
      label={`Resultado de "${pageState().query}"`}
    />
  );
}
