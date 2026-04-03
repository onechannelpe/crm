import { createSignal, For, Show } from "solid-js";

import {
  addLeadNote,
  recordLeadCall,
} from "~/actions/pipeline/commands/interactions";
import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";

import type { LeadAction, LeadCallOutcome } from "./types";

import styles from "./lead-detail-overview.module.css";

const CALL_OUTCOME_OPTIONS = [
  { value: "answered", label: "Contestada" },
  { value: "no_answer", label: "Sin respuesta" },
  { value: "wrong_number", label: "Numero incorrecto" },
  { value: "callback_requested", label: "Pidio devolucion" },
  { value: "qualified", label: "Calificado" },
  { value: "disqualified", label: "Descartado" },
] as const satisfies ReadonlyArray<{
  value: LeadCallOutcome;
  label: string;
}>;

const COMPOSER_MODE_OPTIONS = ["call", "note"] as const;

export function LeadInteractionComposer(props: {
  leadId: number;
  availableActions: LeadAction[];
  onChanged?: () => void;
}) {
  const [composerMode, setComposerMode] = createSignal<"call" | "note">("call");
  const [callOutcome, setCallOutcome] =
    createSignal<LeadCallOutcome>("answered");
  const [bodyText, setBodyText] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  const canLogCall = () => props.availableActions.includes("log-call");
  const canAddNote = () => props.availableActions.includes("add-note");
  const composerModes = () =>
    COMPOSER_MODE_OPTIONS.filter((value) =>
      value === "call" ? canLogCall() : canAddNote(),
    );

  async function handleComposerSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      if (composerMode() === "call") {
        await recordLeadCall({
          leadId: props.leadId,
          outcome: callOutcome(),
          notes: bodyText(),
        });
      } else {
        await addLeadNote({
          leadId: props.leadId,
          body: bodyText(),
        });
      }

      setBodyText("");
      props.onChanged?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo registrar la interaccion.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Show when={canLogCall() || canAddNote()}>
      <section class={styles.section}>
        <div class={styles.sectionTitle}>Registrar interaccion</div>
        <div class={styles.composer}>
          <Select
            label="Tipo"
            value={composerMode()}
            onChange={(event) => {
              const nextMode = composerModes().find(
                (value) => value === event.currentTarget.value,
              );
              if (nextMode) {
                setComposerMode(nextMode);
              }
            }}
          >
            <Show when={canLogCall()}>
              <option value="call">Llamada</option>
            </Show>
            <Show when={canAddNote()}>
              <option value="note">Nota</option>
            </Show>
          </Select>
          <Show when={composerMode() === "call"}>
            <Select
              label="Resultado"
              value={callOutcome()}
              onChange={(event) => {
                const nextOutcome = CALL_OUTCOME_OPTIONS.find(
                  (option) => option.value === event.currentTarget.value,
                );
                if (nextOutcome) {
                  setCallOutcome(nextOutcome.value);
                }
              }}
            >
              <For each={CALL_OUTCOME_OPTIONS}>
                {(option) => (
                  <option value={option.value}>{option.label}</option>
                )}
              </For>
            </Select>
          </Show>
          <Textarea
            label={composerMode() === "call" ? "Notas" : "Contenido"}
            value={bodyText()}
            onInput={(event) => setBodyText(event.currentTarget.value)}
            rows={3}
          />
          <Show when={error()}>
            <p class={styles.errorText}>{error()}</p>
          </Show>
          <div class={styles.actions}>
            <Button
              loading={submitting()}
              onClick={() => void handleComposerSubmit()}
            >
              Guardar
            </Button>
          </div>
        </div>
      </section>
    </Show>
  );
}
