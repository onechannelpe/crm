import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";

import type { recordCall } from "~/actions/pipeline/commands/interactions";
import {
  addRecordNote,
  recordCall as recordCallAction,
} from "~/actions/pipeline/commands/interactions";
import type { queryRecordDetail } from "~/actions/pipeline/queries/records";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleAlert from "~/components/icons/circle-alert";
import Package from "~/components/icons/package";
import Phone from "~/components/icons/phone";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";
import { formatDateTime } from "~/lib/utils";

import styles from "./lead-record-overview.module.css";

type RecordDetail = Awaited<ReturnType<typeof queryRecordDetail>>;

function stageVariant(stage: string) {
  if (stage === "READY_FOR_SALE") return "success" as const;
  if (stage === "NEEDS_EXECUTIVE_INPUT") return "warning" as const;
  return "secondary" as const;
}

function timelineIcon(kind: RecordDetail["timeline"][number]["kind"]) {
  if (kind === "call") {
    return <Phone size={14} />;
  }

  if (kind === "assignment") {
    return <Building2 size={14} />;
  }

  if (kind === "stage-change") {
    return <Package size={14} />;
  }

  return <CalendarDays size={14} />;
}

const CALL_OUTCOME_OPTIONS = [
  { value: "answered", label: "Contestada" },
  { value: "no_answer", label: "Sin respuesta" },
  { value: "wrong_number", label: "Número incorrecto" },
  { value: "callback_requested", label: "Pidió devolución" },
  { value: "qualified", label: "Calificado" },
  { value: "disqualified", label: "Descartado" },
] as const satisfies ReadonlyArray<{
  value: Parameters<typeof recordCall>[0]["outcome"];
  label: string;
}>;

const COMPOSER_MODE_OPTIONS = ["call", "note"] as const;

export function LeadRecordOverview(props: {
  data: RecordDetail;
  compact?: boolean;
  onChanged?: () => void;
}) {
  const [composerMode, setComposerMode] = createSignal<"call" | "note">("call");
  const [callOutcome, setCallOutcome] =
    createSignal<Parameters<typeof recordCall>[0]["outcome"]>("answered");
  const [bodyText, setBodyText] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  const fields = () =>
    [
      { label: "RUC", value: props.data.record.ruc },
      {
        label: "Razón social",
        value: props.data.record.razon_social ?? "Sin datos",
      },
      { label: "Dirección", value: props.data.record.address ?? "Sin datos" },
      { label: "Estado", value: props.data.record.status ?? "Sin datos" },
      { label: "Prioridad", value: props.data.record.prioridad ?? "Sin datos" },
      { label: "Creado", value: formatDateTime(props.data.record.created_at) },
      {
        label: "Actualizado",
        value: formatDateTime(props.data.record.updated_at),
      },
    ] as const;

  const quotations = () => props.data.quotations ?? [];
  const canLogCall = () => props.data.availableActions.includes("log-call");
  const canAddNote = () => props.data.availableActions.includes("add-note");
  const composerModes = () =>
    COMPOSER_MODE_OPTIONS.filter((value) =>
      value === "call" ? canLogCall() : canAddNote(),
    );

  async function handleComposerSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      if (composerMode() === "call") {
        await recordCallAction({
          leadId: props.data.record.id,
          outcome: callOutcome(),
          notes: bodyText(),
        });
      } else {
        await addRecordNote({
          leadId: props.data.record.id,
          body: bodyText(),
        });
      }

      setBodyText("");
      props.onChanged?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo registrar la interacción.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class={styles.content} data-compact={props.compact ? "true" : "false"}>
      <section class={styles.hero}>
        <div class={styles.heroIcon}>
          <Building2 size={16} />
        </div>
        <div class={styles.heroText}>
          <div class={styles.heroTitle}>
            {props.data.record.razon_social ?? props.data.record.ruc}
          </div>
          <div class={styles.heroSubtitle}>RUC {props.data.record.ruc}</div>
        </div>
        <Badge variant={stageVariant(props.data.record.stage)}>
          {props.data.record.stage}
        </Badge>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionTitle}>Campos</div>
        <dl class={styles.fieldGrid}>
          <For each={fields()}>
            {(field) => (
              <div class={styles.fieldRow}>
                <dt class={styles.fieldLabel}>{field.label}</dt>
                <dd class={styles.fieldValue}>{field.value}</dd>
              </div>
            )}
          </For>
        </dl>
      </section>

      <Show when={canLogCall() || canAddNote()}>
        <section class={styles.section}>
          <div class={styles.sectionTitle}>Registrar interacción</div>
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

      <section class={styles.section}>
        <div class={styles.sectionTitle}>Timeline</div>
        <div class={styles.timeline}>
          <For each={props.data.timeline}>
            {(item) => (
              <div class={styles.timelineItem}>
                <span class={styles.timelineIcon}>
                  {timelineIcon(item.kind)}
                </span>
                <div class={styles.timelineBody}>
                  <div class={styles.timelineTitle}>{item.title}</div>
                  <div class={styles.timelineMeta}>
                    {formatDateTime(item.occurredAt)} · {item.actorDisplayName}
                  </div>
                  <div class={styles.timelineDescription}>
                    {item.description}
                  </div>
                </div>
              </div>
            )}
          </For>
          <Show when={props.data.timeline.length === 0}>
            <div class={styles.emptyBlock}>
              <span class={styles.timelineIcon}>
                <CircleAlert size={14} />
              </span>
              <div>
                <div class={styles.timelineTitle}>Sin historial todavía</div>
                <div class={styles.timelineMeta}>
                  Este lead aún no tiene interacciones registradas.
                </div>
              </div>
            </div>
          </Show>
        </div>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionTitle}>Acciones</div>
        <div class={styles.actions}>
          <Show
            when={props.data.availableActions.includes(
              "complete-commercial-input",
            )}
          >
            <A
              class={styles.primaryAction}
              href={`/leads/${props.data.record.id}/complete`}
            >
              Completar información comercial
            </A>
          </Show>
          <Show when={props.data.availableActions.includes("create-sale")}>
            <A
              class={styles.primaryAction}
              href={`/sales/new/${props.data.record.id}`}
            >
              Crear venta
            </A>
          </Show>
          <A
            class={styles.secondaryAction}
            href={`/leads/${props.data.record.id}`}
          >
            Abrir detalle completo
          </A>
        </div>
      </section>

      <Show when={quotations().length > 0}>
        <section class={styles.section}>
          <div class={styles.sectionTitle}>Cotizaciones</div>
          <div class={styles.quoteList}>
            <For each={quotations()}>
              {(quotation) => (
                <div class={styles.quoteRow}>
                  <span>#{quotation.id}</span>
                  <span class={styles.timelineMeta}>
                    {formatDateTime(quotation.created_at)}
                  </span>
                </div>
              )}
            </For>
          </div>
        </section>
      </Show>
    </div>
  );
}
