import { A, createAsync, useNavigate } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";

import Plus from "~/components/icons/plus";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { toAppError } from "~/lib/app-errors";
import { formatDate } from "~/lib/utils";
import { listLeads, registerLead } from "~/actions/pipeline/leads";

import styles from "./leads-page.module.css";

export default function LeadsPage() {
  const navigate = useNavigate();
  const leads = createAsync(() => listLeads({}), { initialValue: [] });
  const [draftRuc, setDraftRuc] = createSignal("");
  const [showDraftRow, setShowDraftRow] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  async function handleRegister() {
    setError(null);
    setSubmitting(true);

    try {
      const { id } = await registerLead({
        ruc: draftRuc().trim(),
        executiveId: 0,
      });
      navigate(`/leads/${id}`);
    } catch (err) {
      setError(toAppError(err, "Error al registrar prospecto").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  function openDraftRow() {
    setShowDraftRow(true);
    setError(null);
  }

  function clearDraftRow() {
    setDraftRuc("");
    setError(null);
    setShowDraftRow(false);
  }

  return (
    <AppPage>
      <div
        class={`${styles.page} record-index-container-gater-for-drag-select`}
      >
        <div class={styles.toolbar}>
          <Button
            variant="secondary"
            onClick={openDraftRow}
            disabled={showDraftRow()}
          >
            <Plus size={16} />
            Agregar fila
          </Button>
        </div>

        <div class={styles.indexContainer}>
          <div class={styles.tableCard}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RUC</TableHead>
                  <TableHead>Razon social</TableHead>
                  <TableHead>Direccion</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Show when={showDraftRow()}>
                  <TableRow class={styles.draftRow}>
                    <TableCell class={styles.rucCell}>
                      <form
                        class={styles.inlineForm}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void handleRegister();
                        }}
                      >
                        <Input
                          value={draftRuc()}
                          onInput={(event) =>
                            setDraftRuc(event.currentTarget.value)
                          }
                          placeholder="Ingresa el RUC"
                          inputmode="numeric"
                          autocomplete="off"
                          error={error() ?? undefined}
                          disabled={submitting()}
                          autofocus
                        />
                        <div class={styles.inlineActions}>
                          <Button
                            type="submit"
                            size="compact"
                            loading={submitting()}
                            disabled={draftRuc().trim().length === 0}
                          >
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="compact"
                            onClick={clearDraftRow}
                            disabled={submitting()}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </TableCell>
                    <TableCell>
                      <span class={styles.placeholderText}>
                        Se completa al guardar
                      </span>
                    </TableCell>
                    <TableCell>
                      <span class={styles.placeholderText}>
                        Se completa al guardar
                      </span>
                    </TableCell>
                    <TableCell>
                      <span class={styles.stageBadge}>Nueva fila</span>
                    </TableCell>
                    <TableCell>
                      <span class={styles.placeholderText}>Pendiente</span>
                    </TableCell>
                  </TableRow>
                </Show>

                <Show
                  when={leads().length > 0 || showDraftRow()}
                  fallback={
                    <tr>
                      <td class={styles.emptyCell} colSpan={5}>
                        <div class={styles.emptyState}>
                          <div class={styles.emptyIcon}>
                            <Plus size={18} />
                          </div>
                          <h2 class={styles.emptyTitle}>
                            Todavia no hay prospectos
                          </h2>
                          <p class={styles.emptyDescription}>
                            Empieza con una fila vacia y registra solo el RUC.
                          </p>
                          <Button
                            variant="secondary"
                            onClick={openDraftRow}
                            disabled={showDraftRow()}
                          >
                            <Plus size={16} />
                            Agregar fila
                          </Button>
                        </div>
                      </td>
                    </tr>
                  }
                >
                  <For each={leads()}>
                    {(lead) => (
                      <TableRow>
                        <TableCell class={styles.rucValueCell}>
                          <A href={`/leads/${lead.id}`} class={styles.leadLink}>
                            {lead.ruc}
                          </A>
                        </TableCell>
                        <TableCell>{lead.razon_social || "Sin datos"}</TableCell>
                        <TableCell class={styles.addressCell}>
                          {lead.address || "Sin datos"}
                        </TableCell>
                        <TableCell>
                          <span class={styles.stageBadge}>{lead.stage}</span>
                        </TableCell>
                        <TableCell>{formatDate(lead.created_at)}</TableCell>
                      </TableRow>
                    )}
                  </For>
                  <Show when={leads().length > 0 && !showDraftRow()}>
                    <tr>
                      <td class={styles.actionCell} colSpan={5}>
                        <button
                          type="button"
                          class={styles.actionRow}
                          onClick={openDraftRow}
                        >
                          <span class={styles.actionIcon}>
                            <Plus size={16} />
                          </span>
                          <span class={styles.actionText}>Agregar fila</span>
                        </button>
                      </td>
                    </tr>
                  </Show>
                </Show>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppPage>
  );
}
