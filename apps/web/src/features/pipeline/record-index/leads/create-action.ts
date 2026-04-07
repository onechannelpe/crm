import Plus from "~/components/icons/plus";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createLeadCreateSidePanelPage } from "~/features/side-panel/types/side-panel-page";

export function useCreateLeadRecordAction() {
  const { openPanel } = useSidePanel();

  return {
    label: "Add New",
    emptyLabel: "Add a prospect",
    inlineLabel: "Add New",
    icon: Plus,
    onClick: () => {
      openPanel(createLeadCreateSidePanelPage());
    },
  };
}
