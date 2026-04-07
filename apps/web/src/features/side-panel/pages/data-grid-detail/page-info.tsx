import { createMemo } from "solid-js";

import Info from "~/components/icons/info";

import { usePageInstanceId } from "../../state/page-instance";
import { useSidePanel } from "../../state/use-side-panel";
import { PageInfoLayout } from "../../top-bar/page-info-layout";

export function DataGridDetailPageInfo() {
  const pageId = usePageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "data-grid-detail") {
      throw new Error(
        "Data grid detail side panel page info state is not available",
      );
    }

    return state;
  });

  return (
    <PageInfoLayout
      icon={<Info size={14} />}
      title={pageState().title}
      label={pageState().subtitle}
    />
  );
}
