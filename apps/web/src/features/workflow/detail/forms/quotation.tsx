import { useAction } from "@solidjs/router";
import { For, createSignal } from "solid-js";

import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import type { LeadDetailQuotationView } from "~/contracts/workflow/views";
import { MONEDAS, type Moneda } from "~/contracts/workflow/vocabulary";
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
import { toAppError } from "~/lib/app-errors";

import { createQuotationMutation } from "../../data/command-mutations";
import { revalidateWorkflowLead } from "../../data/revalidate-workflow";

import styles from "./quotation.module.css";

type QuotationSectionProps = {
  leadId: string;
  existingQuotation?: LeadDetailQuotationView;
};

function isMoneda(value: string): value is Moneda {
  return (MONEDAS as readonly string[]).includes(value);
}

export function QuotationSection(props: QuotationSectionProps) {
  const create = useAction(createQuotationMutation);

  const [paybackPricing, setPaybackPricing] = createSignal(
    props.existingQuotation?.paybackPricing?.toString() ?? "",
  );
  const [tarifaDebito, setTarifaDebito] = createSignal(
    props.existingQuotation?.tarifaDebito?.toString() ?? "",
  );
  const [tarifaCredito, setTarifaCredito] = createSignal(
    props.existingQuotation?.tarifaCredito?.toString() ?? "",
  );
  const [tarifaForaneo, setTarifaForaneo] = createSignal(
    props.existingQuotation?.tarifaForaneo?.toString() ?? "",
  );
  const [fee, setFee] = createSignal(
    props.existingQuotation?.fee?.toString() ?? "",
  );
  const [moneda, setMoneda] = createSignal<Moneda>(
    props.existingQuotation?.moneda ?? "PEN",
  );
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await create({
        leadId: props.leadId,
        paybackPricing: Number(paybackPricing()),
        tarifaDebito: Number(tarifaDebito()),
        tarifaCredito: Number(tarifaCredito()),
        tarifaForaneo: Number(tarifaForaneo()),
        fee: Number(fee()),
        moneda: moneda(),
      });
      await revalidateWorkflowLead(props.leadId);
    } catch (err) {
      setError(toAppError(err, "Error al crear cotización").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RecordDetailSection>
      <RecordDetailSectionHeader>
        <RecordDetailSectionTitle text="Cotizacion" />
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
                  value={tarifaDebito()}
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
                  value={tarifaCredito()}
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
                  value={tarifaForaneo()}
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
                  value={moneda()}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    if (isMoneda(val)) {
                      setMoneda(val);
                    }
                  }}
                >
                  <For each={MONEDAS}>
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
              Crear cotización
            </Button>
          </RecordDetailSectionActions>
        </form>
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}
