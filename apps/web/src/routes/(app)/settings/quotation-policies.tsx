import { createAsync, useAction, useSubmission } from "@solidjs/router";
import { Show, createUniqueId, type Accessor } from "solid-js";
import { createStore } from "solid-js/store";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { updateRateProposalPolicyMutation } from "~/lib/mutations/workflow-settings";
import { rateProposalPolicyQuery } from "~/lib/queries/workflow-settings";
import { formatDateTime } from "~/lib/utils";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./settings-page.module.css";

type RateProposalPolicySnapshot = Awaited<
  ReturnType<typeof rateProposalPolicyQuery>
>;

function QuotationPolicyEditor(props: {
  snapshot: Accessor<RateProposalPolicySnapshot>;
}) {
  const initialSnapshot = props.snapshot();
  const updatePolicy = useAction(updateRateProposalPolicyMutation);
  const submission = useSubmission(updateRateProposalPolicyMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const formId = createUniqueId();
  const [draft, setDraft] = createStore({
    validityDays: String(initialSnapshot.validityDays),
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    try {
      await updatePolicy({ validityDays: Number(draft.validityDays) });
      enqueueSuccessSnackBar("Vigencia actualizada");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  return (
    <SettingsSection
      title="Vigencia de propuestas"
      description="Cuántos días puede el ejecutivo aceptar una tarifa propuesta."
      actions={
        <Button
          type="submit"
          form={formId}
          size="sm"
          variant="secondary"
          loading={submission.pending}
        >
          Guardar
        </Button>
      }
    >
      <form
        id={formId}
        class={styles.stack}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div class={styles.formGrid}>
          <Input
            type="number"
            min="1"
            max="90"
            step="1"
            label="Vigencia de propuesta (días)"
            value={draft.validityDays}
            onInput={(event) =>
              setDraft("validityDays", event.currentTarget.value)
            }
            required
          />
        </div>

        <p class={styles.helperText}>
          Límite predeterminado del sistema:{" "}
          {props.snapshot().defaultValidityDays} días.
          <Show when={props.snapshot().updatedAt}>
            {(updatedAt) => (
              <> Última actualización: {formatDateTime(updatedAt())}.</>
            )}
          </Show>
        </p>
      </form>
    </SettingsSection>
  );
}

export default function QuotationPoliciesPage() {
  const policy = createAsync(() => rateProposalPolicyQuery(), {
    initialValue: null,
  });

  return (
    <Show when={policy()}>
      {(snapshot) => <QuotationPolicyEditor snapshot={snapshot} />}
    </Show>
  );
}
