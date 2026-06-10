import { useAction } from "@solidjs/router";
import { createSignal } from "solid-js";

import type { LeadDetailLeadView } from "~/contracts/workflow/views";
import {
  addLeadToFavoritesMutation,
  deleteLeadMutation,
  removeLeadFromFavoritesMutation,
} from "~/features/workflow/data/command-mutations";
import {
  revalidateWorkflowLead,
  revalidateWorkflowLeadList,
} from "~/features/workflow/data/revalidate-workflow";

function exportLeadAsJson(lead: LeadDetailLeadView) {
  const payload = {
    empresa: lead,
    exportadoEn: new Date().toISOString(),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `empresa-${lead.id}.json`;
  anchor.click();

  URL.revokeObjectURL(url);
}

// Lead actions shared by the full-page header and the side-panel footer.
// Owns the favorites mutation/revalidate wiring and JSON export; callers
// layer their own UX (snackbars) on top.
export function useLeadActions() {
  const addFavorite = useAction(addLeadToFavoritesMutation);
  const removeFavorite = useAction(removeLeadFromFavoritesMutation);
  const deleteLeadAction = useAction(deleteLeadMutation);

  const [favoriteBusy, setFavoriteBusy] = createSignal(false);
  const [deleteBusy, setDeleteBusy] = createSignal(false);

  // Soft-deletes the lead and refreshes the list so it drops out of active
  // views. Callers own the post-delete navigation away from the record.
  async function deleteLead(leadId: string): Promise<void> {
    if (deleteBusy()) {
      return;
    }

    setDeleteBusy(true);

    try {
      await deleteLeadAction({ leadId });
      await revalidateWorkflowLeadList();
    } finally {
      setDeleteBusy(false);
    }
  }

  async function setFavorite(
    leadId: string,
    isFavorite: boolean,
  ): Promise<{ message: string } | undefined> {
    if (favoriteBusy()) {
      return undefined;
    }

    setFavoriteBusy(true);

    try {
      const result = isFavorite
        ? await removeFavorite({ leadId })
        : await addFavorite({ leadId });

      await revalidateWorkflowLead(leadId);

      return result;
    } finally {
      setFavoriteBusy(false);
    }
  }

  return {
    favoriteBusy,
    setFavorite,
    deleteBusy,
    deleteLead,
    exportLead: exportLeadAsJson,
  };
}
