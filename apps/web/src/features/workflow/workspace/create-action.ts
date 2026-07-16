import Plus from "~/components/icons/plus";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createLeadRecordCreateSidePanelPage } from "~/features/side-panel/types/side-panel-page";

export function useCreateLeadRecordAction(options?: {
  isBlocked: () => boolean;
  onBlocked: () => void;
}) {
  const { openPanel } = useSidePanel();

  return {
    label: "Añadir nuevo",
    emptyLabel: "Añadir un cliente",
    inlineLabel: "Añadir nuevo",
    icon: Plus,
    onClick: () => {
      // Show the registration cap before opening a form that would reject it.
      if (options?.isBlocked()) {
        options.onBlocked();
        return;
      }
      openPanel(createLeadRecordCreateSidePanelPage());
    },
  };
}
