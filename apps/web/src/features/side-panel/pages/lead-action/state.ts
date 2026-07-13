import { createMemo } from "solid-js";

import { useSidePanelPageState } from "../../router/page-state";

export function useLeadActionPageState() {
  const pageState = useSidePanelPageState("lead-action");

  const leadId = createMemo(() => pageState().leadId);
  const action = createMemo(() => pageState().action);

  return { pageState, leadId, action };
}
