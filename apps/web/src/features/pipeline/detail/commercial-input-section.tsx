import { useAction } from "@solidjs/router";
import { createSignal } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import Target from "~/components/icons/target";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import {
  FieldIcon,
  FieldInputValue,
  FieldLabel,
  FieldLabelText,
  FieldRow,
  FieldTable,
} from "~/features/side-panel/components/field-table";
import { toAppError } from "~/lib/app-errors";
import type { LeadDetailCommercialInputView } from "~/server/pipeline/application/queries/views/lead-detail";

import { completeCommercialInputMutation } from "../data/mutations";

import styles from "./commercial-input-section.module.css";

export function CommercialInputSection(props: {
  leadId: number;
  initialValues?: LeadDetailCommercialInputView;
}) {
  const complete = useAction(completeCommercialInputMutation);

  const [proveedorActual, setProveedorActual] = createSignal(
    props.initialValues?.proveedorActual ?? "",
  );
  const [tasaActual, setTasaActual] = createSignal(
    props.initialValues?.tasaActual?.toString() ?? "",
  );
  const [gpv, setGpv] = createSignal(
    props.initialValues?.gpv?.toString() ?? "",
  );
  const [ticket, setTicket] = createSignal(
    props.initialValues?.ticket?.toString() ?? "",
  );
  const [abono, setAbono] = createSignal(
    props.initialValues?.abono?.toString() ?? "",
  );
  const [cantidadPos, setCantidadPos] = createSignal(
    props.initialValues?.cantidadPos?.toString() ?? "",
  );
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!proveedorActual().trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await complete({
        leadId: props.leadId,
        proveedorActual: proveedorActual(),
        tasaActual: Number(tasaActual()),
        gpv: Number(gpv()),
        ticket: Number(ticket()),
        abono: Number(abono()),
        cantidadPos: Number(cantidadPos()),
      });
    } catch (err) {
      setError(toAppError(err, "Error al guardar").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section class={styles.section}>
      <p class={styles.eyebrow}>Datos comerciales</p>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <FieldTable>
          <FieldRow>
            <FieldLabel>
              <FieldIcon>
                <Building2 size={16} />
              </FieldIcon>
              <FieldLabelText>Proveedor</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              <TextInput
                sizeVariant="sm"
                value={proveedorActual()}
                onChange={setProveedorActual}
                required
              />
            </FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldIcon>
                <Target size={16} />
              </FieldIcon>
              <FieldLabelText>Tasa actual</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              <TextInput
                sizeVariant="sm"
                type="number"
                step="0.01"
                min="0"
                value={tasaActual()}
                onChange={setTasaActual}
                required
              />
            </FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldIcon>
                <Moneybag size={16} />
              </FieldIcon>
              <FieldLabelText>GPV</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              <TextInput
                sizeVariant="sm"
                type="number"
                step="0.01"
                min="0"
                value={gpv()}
                onChange={setGpv}
                required
              />
            </FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldIcon>
                <Moneybag size={16} />
              </FieldIcon>
              <FieldLabelText>Ticket</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              <TextInput
                sizeVariant="sm"
                type="number"
                step="0.01"
                min="0"
                value={ticket()}
                onChange={setTicket}
                required
              />
            </FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldIcon>
                <Moneybag size={16} />
              </FieldIcon>
              <FieldLabelText>Abono</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              <TextInput
                sizeVariant="sm"
                type="number"
                step="0.01"
                min="0"
                value={abono()}
                onChange={setAbono}
                required
              />
            </FieldInputValue>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              <FieldIcon>
                <Package size={16} />
              </FieldIcon>
              <FieldLabelText>Cantidad POS</FieldLabelText>
            </FieldLabel>
            <FieldInputValue>
              <TextInput
                sizeVariant="sm"
                type="number"
                step="1"
                min="0"
                value={cantidadPos()}
                onChange={setCantidadPos}
                required
              />
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
            Guardar datos comerciales
          </Button>
        </div>
      </form>
    </section>
  );
}
