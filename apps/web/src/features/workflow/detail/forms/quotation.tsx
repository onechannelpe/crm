import { useAction } from "@solidjs/router";
import { For, createSignal } from "solid-js";

import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import type { LeadDetailQuotationView } from "~/contracts/workflow/views";
import { MONEDAS, type Moneda } from "~/contracts/workflow/vocabulary";
import {
  FieldIcon,
  FieldInputValue,
  FieldLabel,
  FieldLabelText,
  FieldRow,
  FieldTable,
} from "~/features/side-panel/components/field-table";
import {
  Widget,
  WidgetBody,
  WidgetHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
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
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Cotizacion" />
      </WidgetHeader>
      <WidgetBody>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <FieldTable>
            <FieldRow>
              <FieldLabel>
                <FieldIcon>
                  <Moneybag size={16} />
                </FieldIcon>
                <FieldLabelText>Payback</FieldLabelText>
              </FieldLabel>
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
            <FieldRow>
              <FieldLabel>
                <FieldIcon>
                  <Moneybag size={16} />
                </FieldIcon>
                <FieldLabelText>T. debito</FieldLabelText>
              </FieldLabel>
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
            <FieldRow>
              <FieldLabel>
                <FieldIcon>
                  <Moneybag size={16} />
                </FieldIcon>
                <FieldLabelText>T. credito</FieldLabelText>
              </FieldLabel>
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
            <FieldRow>
              <FieldLabel>
                <FieldIcon>
                  <Moneybag size={16} />
                </FieldIcon>
                <FieldLabelText>T. foraneo</FieldLabelText>
              </FieldLabel>
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
            <FieldRow>
              <FieldLabel>
                <FieldIcon>
                  <Moneybag size={16} />
                </FieldIcon>
                <FieldLabelText>Fee</FieldLabelText>
              </FieldLabel>
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
            <FieldRow>
              <FieldLabel>
                <FieldIcon>
                  <Package size={16} />
                </FieldIcon>
                <FieldLabelText>Moneda</FieldLabelText>
              </FieldLabel>
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
          <div class={styles.actions}>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting()}
            >
              Crear cotización
            </Button>
          </div>
        </form>
      </WidgetBody>
    </Widget>
  );
}
