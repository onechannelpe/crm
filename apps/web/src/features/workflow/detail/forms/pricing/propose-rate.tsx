import { useAction } from "@solidjs/router";
import { For, createSignal } from "solid-js";

import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import type { LeadDetailRateProposalView } from "~/contracts/workflow/views";
import { CURRENCIES, type Currency } from "~/contracts/workflow/vocabulary";
import {
  FieldInputValue,
  FieldRow,
  FieldTable,
} from "~/features/side-panel/components/field-table";
import {
  RecordDetailSectionActions,
  RecordDetailSection,
  RecordDetailSectionBody,
  RecordDetailSectionHeader,
  RecordDetailSectionTitle,
} from "~/features/side-panel/components/record-detail-section";
import { actionErrorMessage } from "~/lib/wire-error";

import { proposeRateMutation } from "../../../data/command-mutations";
import { revalidateWorkflowLead } from "../../../data/revalidate-workflow";

import styles from "../quotation.module.css";

type ProposeRateSectionProps = {
  leadId: string;
  // The latest proposal, when present, seeds the form so back office can adjust
  // the previous round after a revision request.
  latestProposal?: LeadDetailRateProposalView;
};

function isMoneda(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

export function ProposeRateSection(props: ProposeRateSectionProps) {
  const propose = useAction(proposeRateMutation);

  const [paybackPricing, setPaybackPricing] = createSignal(
    props.latestProposal?.paybackPricing?.toString() ?? "",
  );
  const [proposedDebitRate, setTarifaDebito] = createSignal(
    props.latestProposal?.proposedDebitRate?.toString() ?? "",
  );
  const [proposedCreditRate, setTarifaCredito] = createSignal(
    props.latestProposal?.proposedCreditRate?.toString() ?? "",
  );
  const [proposedForeignRate, setTarifaForaneo] = createSignal(
    props.latestProposal?.proposedForeignRate?.toString() ?? "",
  );
  const [fee, setFee] = createSignal(
    props.latestProposal?.fee?.toString() ?? "",
  );
  const [currency, setMoneda] = createSignal<Currency>(
    props.latestProposal?.currency ?? "PEN",
  );
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await propose({
        leadId: props.leadId,
        paybackPricing: Number(paybackPricing()),
        proposedDebitRate: Number(proposedDebitRate()),
        proposedCreditRate: Number(proposedCreditRate()),
        proposedForeignRate: Number(proposedForeignRate()),
        fee: Number(fee()),
        currency: currency(),
      });
      await revalidateWorkflowLead(props.leadId);
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RecordDetailSection>
      <RecordDetailSectionHeader>
        <RecordDetailSectionTitle text="Proponer tarifa" />
      </RecordDetailSectionHeader>
      <RecordDetailSectionBody>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <FieldTable>
            <FieldRow label="Payback" icon={Moneybag}>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paybackPricing()}
                  onChange={setPaybackPricing}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow label="T. debito" icon={Moneybag}>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={proposedDebitRate()}
                  onChange={setTarifaDebito}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow label="T. credito" icon={Moneybag}>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={proposedCreditRate()}
                  onChange={setTarifaCredito}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow label="T. foraneo" icon={Moneybag}>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={proposedForeignRate()}
                  onChange={setTarifaForaneo}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow label="Fee" icon={Moneybag}>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fee()}
                  onChange={setFee}
                  required
                />
              </FieldInputValue>
            </FieldRow>
            <FieldRow label="Moneda" icon={Package}>
              <FieldInputValue>
                <select
                  class={styles.select}
                  value={currency()}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    if (isMoneda(val)) {
                      setMoneda(val);
                    }
                  }}
                >
                  <For each={CURRENCIES}>
                    {(m) => <option value={m}>{m}</option>}
                  </For>
                </select>
              </FieldInputValue>
            </FieldRow>
          </FieldTable>
          {error() && <p class={styles.error}>{error()}</p>}
          <RecordDetailSectionActions>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting()}
            >
              Proponer tarifa
            </Button>
          </RecordDetailSectionActions>
        </form>
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}
