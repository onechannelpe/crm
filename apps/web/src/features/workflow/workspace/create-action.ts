import Plus from "~/components/icons/plus";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createLeadRecordCreateSidePanelPage } from "~/features/side-panel/types/side-panel-page";

// When registration is blocked (too many pending quotation decisions) the click
// surfaces the reason instead of opening the form, so the executive is never
// dropped into a form that will reject on submit.
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
      if (options?.isBlocked()) {
        options.onBlocked();
        return;
      }
      openPanel(createLeadRecordCreateSidePanelPage());
    },
  };
}
