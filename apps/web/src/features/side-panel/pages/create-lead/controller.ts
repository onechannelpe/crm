import { createEffect, createSignal, on, type Accessor } from "solid-js";

import type { CurrentUserView } from "~/contracts/auth";
import { codeIs } from "~/contracts/error-codes";
import { parseWireError } from "~/contracts/errors";
import type { CreateLeadInput } from "~/contracts/workflow/inputs";
import { shortName } from "~/domain/identity/display-name";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import {
  addOptimisticLead,
  createOptimisticLeadRow,
} from "~/features/workflow/data/optimistic-leads";
import {
  toCommercialScopePayload,
  type CommercialScopeFormValues,
} from "~/features/workflow/forms/commercial-scope/values";

import { createCommandController } from "../../core/commands/create-command-controller";
import { createOptimisticTransactionStore } from "../../core/optimistic/create-optimistic-transaction-store";

type CreateLeadResult = {
  leadId: string;
};

type CreateLeadControllerInput = {
  draftRuc: Accessor<string>;
  inquiryId: Accessor<string | null>;
  validRuc: Accessor<string | null>;
  previewName: Accessor<string | null>;
  scope: Accessor<CommercialScopeFormValues>;
  currentUser: Accessor<CurrentUserView>;
  createLead: (input: CreateLeadInput) => Promise<CreateLeadResult>;
  onLeadCreated: (input: { leadId: string; ruc: string }) => void;
  setActiveTab: (tab: RecordTabId) => void;
};

export function createCreateLeadController(input: CreateLeadControllerInput) {
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  createEffect(
    on(input.draftRuc, () => setErrorMessage(null), { defer: true }),
  );

  const optimisticTransactions = createOptimisticTransactionStore();
  const createCommand = createCommandController({
    run: (command: CreateLeadInput) => input.createLead(command),
  });

  async function submit() {
    if (createCommand.pending()) {
      return;
    }

    const ruc = input.validRuc();
    if (!ruc) {
      setErrorMessage("El RUC debe tener 11 dígitos.");
      input.setActiveTab("registro");
      return;
    }

    const scopePayload = toCommercialScopePayload(input.scope());
    if (!scopePayload.ok) {
      setErrorMessage(scopePayload.error);
      input.setActiveTab("registro");
      return;
    }

    setErrorMessage(null);

    const user = input.currentUser();

    const txId = optimisticTransactions.begin({
      apply: () =>
        addOptimisticLead(
          ["mine", "review", "all"],
          createOptimisticLeadRow({
            ruc,
            legalName: input.previewName(),
            address: null,
            executiveId: user.id,
            executiveName: shortName(user),
            createdBy: user.id,
            createdByName: shortName(user),
          }),
        ),
    });

    try {
      const result = await createCommand.run({
        ruc,
        inquiryId: input.inquiryId() ?? undefined,
        ...scopePayload.value,
      });
      optimisticTransactions.commit(txId);
      input.onLeadCreated({ leadId: result.leadId, ruc });
    } catch (submitError) {
      optimisticTransactions.rollback(txId);
      const wire = parseWireError(submitError);
      if (codeIs(wire, "invalid_ruc") || codeIs(wire, "ruc_required")) {
        setErrorMessage(wire.message);
        input.setActiveTab("registro");
        return;
      }

      setErrorMessage(wire.message);
    }
  }

  return {
    errorMessage,
    submitting: createCommand.pending,
    submit,
  };
}
