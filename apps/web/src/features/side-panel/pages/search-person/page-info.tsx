import { createMemo } from "solid-js";

import User from "~/components/icons/user";

import { usePageInstanceId } from "../../state/page-instance";
import { useSidePanel } from "../../state/use-side-panel";
import { PageInfoLayout } from "../../top-bar/page-info-layout";

export function SearchPersonPageInfo() {
  const pageId = usePageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "search-person-detail") {
      throw new Error(
        "Search person side panel page info state is not available",
      );
    }

    return state;
  });

  return (
    <PageInfoLayout
      icon={<User size={14} />}
      title={pageState().person.displayName}
      label={`Resultado de "${pageState().query}"`}
    />
  );
}
