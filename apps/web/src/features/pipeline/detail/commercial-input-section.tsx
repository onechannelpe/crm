import { useAction } from "@solidjs/router";
import { createSignal } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { toAppError } from "~/lib/app-errors";
import type { LeadDetailCommercialInputView } from "~/server/pipeline/application/queries/views/lead-detail";

import { completeCommercialInputMutation } from "../data/mutations";

import styles from "./lead-actions-widget.module.css";

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
    <section class={styles.commercialInputSection}>
      <h4 class={styles.commercialInputTitle}>Datos comerciales</h4>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <div class={styles.commercialInputGrid}>
          <div class={styles.commercialInputFull}>
            <Input
              label="Proveedor actual"
              value={proveedorActual()}
              onInput={(e) => setProveedorActual(e.currentTarget.value)}
              required
            />
          </div>
          <Input
            label="Tasa actual"
            type="number"
            step="0.01"
            min="0"
            value={tasaActual()}
            onInput={(e) => setTasaActual(e.currentTarget.value)}
            required
          />
          <Input
            label="GPV"
            type="number"
            step="0.01"
            min="0"
            value={gpv()}
            onInput={(e) => setGpv(e.currentTarget.value)}
            required
          />
          <Input
            label="Ticket"
            type="number"
            step="0.01"
            min="0"
            value={ticket()}
            onInput={(e) => setTicket(e.currentTarget.value)}
            required
          />
          <Input
            label="Abono"
            type="number"
            step="0.01"
            min="0"
            value={abono()}
            onInput={(e) => setAbono(e.currentTarget.value)}
            required
          />
          <Input
            label="Cantidad POS"
            type="number"
            step="1"
            min="0"
            value={cantidadPos()}
            onInput={(e) => setCantidadPos(e.currentTarget.value)}
            required
          />
        </div>
        {error() && <p class={styles.errorText}>{error()}</p>}
        <div class={styles.commercialInputActions}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting()}
          >
            Guardar
          </Button>
        </div>
      </form>
    </section>
  );
}
