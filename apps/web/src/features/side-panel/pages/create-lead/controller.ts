import { createEffect, createSignal, on, type Accessor } from "solid-js";

import type { CurrentUserView } from "~/actions/auth/contracts";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import {
  addOptimisticLead,
  createOptimisticLeadRow,
} from "~/features/workflow/data/optimistic-leads";
import { revalidateWorkflowLeadList } from "~/features/workflow/data/revalidate-workflow";
import { shortName } from "~/lib/users/display-name";
import { parseWireError } from "~/lib/wire-error";
import { codeIs } from "~/lib/wire-error-codes";

import { createCommandController } from "../../core/commands/create-command-controller";
import { createOptimisticTransactionStore } from "../../core/optimistic/create-optimistic-transaction-store";

type BootstrapPreview = {
  razonSocial: string | null;
  address: string | null;
};

type CreateLeadResult = {
  leadId: string;
};

type CreateLeadControllerInput = {
  draftRuc: Accessor<string>;
  validRuc: Accessor<string | null>;
  currentUser: Accessor<CurrentUserView>;
  latestBootstrapPreview: Accessor<BootstrapPreview | null>;
  createLead: (input: { ruc: string }) => Promise<CreateLeadResult>;
  onLeadCreated: (input: { leadId: string; ruc: string }) => void;
  setActiveTab: (tab: RecordTabId) => void;
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
            createdBy: user.id,
            createdByName: shortName(user),
          }),
        ),
    });

    try {
      const result = await createCommand.run({ ruc });
      await revalidateWorkflowLeadList();
      optimisticTransactions.commit(txId);
      input.onLeadCreated({ leadId: result.leadId, ruc });
    } catch (submitError) {
      optimisticTransactions.rollback(txId);
      const wire = parseWireError(submitError);
      if (codeIs(wire, "invalid_ruc") || codeIs(wire, "ruc_required")) {
        setError(wire.message);
        input.setActiveTab("home");
        return;
      }

      setError(wire.message);
    }
  }

  return {
    error,
    setError,
    submitting: createCommand.pending,
    submit,
  };
}
