import { useAction } from "@solidjs/router";
import { createSignal } from "solid-js";

import type { LeadDetailLeadView } from "~/contracts/workflow/views";
import {
  addLeadToFavoritesMutation,
  removeLeadFromFavoritesMutation,
} from "~/features/workflow/data/command-mutations";
import { revalidateWorkflowLead } from "~/features/workflow/data/revalidate-workflow";

function exportLead(lead: LeadDetailLeadView) {
  const payload = { empresa: lead, exportadoEn: new Date().toISOString() };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `empresa-${lead.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Record actions shared by the full-page header and the side-panel footer. Owns the
// favorites mutation/revalidate wiring and the JSON export; callers layer their own
// UX (snackbars) on top.
export function useRecordActions() {
  const addFavorite = useAction(addLeadToFavoritesMutation);
  const removeFavorite = useAction(removeLeadFromFavoritesMutation);
  const [favoriteBusy, setFavoriteBusy] = createSignal(false);

  async function setFavorite(leadId: string, currentlyFavorite: boolean) {
    if (favoriteBusy()) return;

    setFavoriteBusy(true);
    try {
      if (currentlyFavorite) {
        await removeFavorite({ leadId });
      } else {
        await addFavorite({ leadId });
      }
      await revalidateWorkflowLead(leadId);
    } finally {
      setFavoriteBusy(false);
    }
  }

  return { favoriteBusy, setFavorite, exportLead };
}
