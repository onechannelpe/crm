import { For, Show } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";
import type { LeadCallOutcome } from "~/pipeline/contracts/lead-schema";

import {
  hasInteractionMode,
  type InteractionAvailability,
} from "./availability";
import { isInteractionMode, type InteractionState } from "./state";

import styles from "../lead-detail-overview.module.css";

const CALL_OUTCOME_OPTIONS = [
  { value: "answered", label: "Contestada" },
  { value: "no_answer", label: "Sin respuesta" },
  { value: "wrong_number", label: "Número incorrecto" },
  { value: "callback_requested", label: "Pidió devolución" },
  { value: "qualified", label: "Calificado" },
  { value: "disqualified", label: "Descartado" },
] as const satisfies ReadonlyArray<{
  value: LeadCallOutcome;
  label: string;
}>;

export function InteractionForm(props: {
  availability: InteractionAvailability;
  state: InteractionState;
  onSubmit: () => void;
}) {
  return (
    <div class={styles.composer}>
      <Select
        label="Tipo"
        value={props.state.mode()}
        onChange={(event) => {
          const nextMode = event.currentTarget.value;
          if (isInteractionMode(nextMode)) {
            props.state.setMode(nextMode);
          }
        }}
      >
        <Show when={hasInteractionMode(props.availability, "call")}>
          <option value="call">Llamada</option>
        </Show>
        <Show when={hasInteractionMode(props.availability, "note")}>
          <option value="note">Nota</option>
        </Show>
      </Select>
      <Show when={props.state.mode() === "call"}>
        <Select
          label="Resultado"
          value={props.state.callOutcome()}
          onChange={(event) => {
            const nextOutcome = CALL_OUTCOME_OPTIONS.find(
              (option) => option.value === event.currentTarget.value,
            );
            if (nextOutcome) {
              props.state.setCallOutcome(nextOutcome.value);
            }
          }}
        >
          <For each={CALL_OUTCOME_OPTIONS}>
            {(option) => <option value={option.value}>{option.label}</option>}
          </For>
        </Select>
      </Show>
      <Textarea
        label={props.state.mode() === "call" ? "Notas" : "Contenido"}
        value={props.state.body()}
        onInput={(event) => props.state.setBody(event.currentTarget.value)}
        rows={3}
      />
      <Show when={props.state.error()}>
        <p class={styles.errorText}>{props.state.error()}</p>
      </Show>
      <div class={styles.actions}>
        <Button loading={props.state.submitting()} onClick={props.onSubmit}>
          Guardar
        </Button>
      </div>
    </div>
  );
}
