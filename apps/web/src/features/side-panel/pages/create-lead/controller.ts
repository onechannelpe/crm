import { createEffect, createSignal, on, type Accessor } from "solid-js";

import type { CurrentUserView } from "~/actions/auth/contracts";
import {
  addOptimisticLead,
  createOptimisticLeadRow,
} from "~/features/pipeline/data/optimistic-leads";
import { toAppError } from "~/lib/app-errors";
import { shortName } from "~/lib/users/display-name";

import { createCommandController } from "../../core/commands/create-command-controller";
import { createOptimisticTransactionStore } from "../../core/optimistic/create-optimistic-transaction-store";
import type { LeadRecordTabId } from "../record-page/model";

type BootstrapPreview = {
  razonSocial: string | null;
  address: string | null;
};

type CreateLeadResult = {
  leadId: number;
};

type CreateLeadControllerInput = {
  draftRuc: Accessor<string>;
  validRuc: Accessor<string | null>;
  currentUser: Accessor<CurrentUserView>;
  latestBootstrapPreview: Accessor<BootstrapPreview | null>;
  createLead: (input: { ruc: string }) => Promise<CreateLeadResult>;
  onLeadCreated: (input: { leadId: number; ruc: string }) => void;
  setActiveTab: (tab: LeadRecordTabId) => void;
};

export function createCreateLeadController(input: CreateLeadControllerInput) {
  const [error, setError] = createSignal<string | null>(null);

  createEffect(on(input.draftRuc, () => setError(null), { defer: true }));

  const optimisticTransactions = createOptimisticTransactionStore();
  const createCommand = createCommandController({
    run: ({ ruc }: { ruc: string }) => input.createLead({ ruc }),
  });

  async function submit() {
    if (createCommand.pending()) {
      return;
    }

    const ruc = input.validRuc();
    if (!ruc) {
      setError("El RUC debe tener 11 dígitos.");
      input.setActiveTab("home");
      return;
    }

    setError(null);

    const preview = input.latestBootstrapPreview();
    const user = input.currentUser();

    const txId = optimisticTransactions.begin({
      apply: () =>
        addOptimisticLead(
          ["mine", "review", "all"],
          createOptimisticLeadRow({
            ruc,
            razonSocial: preview?.razonSocial ?? null,
            address: preview?.address ?? null,
            executiveId: user.id,
            executiveName: shortName(user),
          }),
        ),
    });

    try {
      const result = await createCommand.run({ ruc });
      optimisticTransactions.commit(txId);
      input.onLeadCreated({ leadId: result.leadId, ruc });
    } catch (submitError) {
      optimisticTransactions.rollback(txId);
      const appError = toAppError(submitError, "Error al registrar prospecto");
      if (
        appError.code === "validation" &&
        appError.publicMessage.includes("RUC")
      ) {
        setError(appError.publicMessage);
        input.setActiveTab("home");
        return;
      }

      setError(appError.publicMessage);
    }
  }

  return {
    error,
    setError,
    submitting: createCommand.pending,
    submit,
  };
}
