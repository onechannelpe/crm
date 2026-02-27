import { type Component, createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";

import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";

import styles from "./register-call-dialog.module.css";

interface RegisterCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (outcome: string, notes: string) => void;
}

export const RegisterCallDialog: Component<RegisterCallDialogProps> = (
  props,
) => {
  const [outcome, setOutcome] = createSignal("no_answer");
  const [notes, setNotes] = createSignal("");

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    props.onSubmit(outcome(), notes());
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class={styles.overlay}>
          <form class={styles.dialog} onSubmit={handleSubmit}>
            <h3 class={styles.title}>Registrar llamada</h3>

            <Select
              label="Resultado"
              value={outcome()}
              required
              onChange={(e) => setOutcome(e.currentTarget.value)}
            >
              <option value="sale_made">Venta realizada</option>
              <option value="no_answer">Sin respuesta</option>
              <option value="not_interested">No interesado</option>
              <option value="follow_up_later">Seguimiento posterior</option>
              <option value="wrong_number">Número incorrecto</option>
            </Select>

            <Show when={outcome() !== "sale_made"}>
              <Textarea
                label="Notas"
                placeholder="Detalles de la llamada..."
                value={notes()}
                onInput={(e) => setNotes(e.currentTarget.value)}
                rows={3}
              />
            </Show>

            <div class={styles.actions}>
              <Button type="button" variant="outline" onClick={props.onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                {outcome() === "sale_made" ? "Crear venta" : "Completar"}
              </Button>
            </div>
          </form>
        </div>
      </Portal>
    </Show>
  );
};
