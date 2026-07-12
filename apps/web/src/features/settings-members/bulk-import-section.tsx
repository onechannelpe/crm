import { createAsync } from "@solidjs/router";
import { For, Show, createEffect, createSignal, on } from "solid-js";

import { applyBulkImport, previewBulkCsv } from "~/actions/team/bulk-import";
import { EmptyState } from "~/components/feedback/empty-state/empty";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { FileInput } from "~/components/ui/input/file-input";
import { Select } from "~/components/ui/input/select";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table-grid/table-grid";
import type {
  BulkApplyResult,
  BulkPreviewResult,
} from "~/contracts/team/bulk-import";
import { readFileText } from "~/lib/file/read-file-text";
import { APP_LOCALE } from "~/lib/locale";
import { bulkImportSetupQuery } from "~/lib/queries/team";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./settings-members.module.css";

const ERROR_COLUMNS = "64px 1fr";
const PREVIEW_COLUMNS = "1.2fr 1fr 1.6fr 1fr 1fr";

export function BulkImportSection() {
  const bulkImportSetup = createAsync(() => bulkImportSetupQuery());
  const [role, setRole] = createSignal("");
  const [csvFile, setCsvFile] = createSignal<File | null>(null);
  const [preview, setPreview] = createSignal<BulkPreviewResult | null>(null);
  const [result, setResult] = createSignal<BulkApplyResult | null>(null);
  const [isPreviewing, setIsPreviewing] = createSignal(false);
  const [isImporting, setIsImporting] = createSignal(false);
  const { enqueueErrorSnackBar } = useSnackBar();

  createEffect(
    on(bulkImportSetup, (im) => {
      if (!im) return;
      if (!im.assignableRoles.some((o) => o.value === role())) {
        setRole(im.assignableRoles[0]?.value ?? "");
      }
    }),
  );

  async function handlePreview(): Promise<void> {
    const file = csvFile();
    if (!file || !role()) return;
    setIsPreviewing(true);
    setPreview(null);
    setResult(null);
    try {
      const csv = await readFileText(file);
      const data = await previewBulkCsv(csv, role());
      setPreview(data);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleImport(): Promise<void> {
    const file = csvFile();
    if (!file || !role()) return;
    setIsImporting(true);
    try {
      const csv = await readFileText(file);
      const data = await applyBulkImport(csv, role());
      setResult(data);
      setCsvFile(null);
      setPreview(null);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Show when={bulkImportSetup()} keyed>
      {(im) => (
        <SettingsSection
          title="Importar desde CSV"
          description="Carga un archivo CSV con columnas: FIRST_SURNAME, SECOND_SURNAME, NAMES, EMAIL, DATE_EXPIRY (opcional), EXECUTIVE_CATEGORY (requerido para ejecutivos: elite o corporativa)."
        >
          <div class={styles.inviteForm}>
            <FileInput
              label="Archivo CSV"
              accept=".csv"
              onChange={(event) => {
                setCsvFile(event.currentTarget.files?.[0] ?? null);
                setPreview(null);
                setResult(null);
              }}
            />
            <Select
              label="Rol"
              value={role()}
              onInput={(event) => setRole(event.currentTarget.value)}
            >
              <For each={im.assignableRoles}>
                {(option) => (
                  <option value={option.value}>{option.label}</option>
                )}
              </For>
            </Select>
            <div class={styles.inviteActions}>
              <Button
                type="button"
                variant="outline"
                disabled={!csvFile() || !role() || isPreviewing()}
                loading={isPreviewing()}
                onClick={() => {
                  void handlePreview();
                }}
              >
                Previsualizar
              </Button>
            </div>
          </div>

          <Show when={preview()}>
            {(p) => (
              <>
                <Show when={p().parsed.errors.length > 0}>
                  <div class={styles.importBlock}>
                    <p class={styles.importNote}>
                      {p().parsed.errors.length} fila(s) con errores (serán
                      omitidas):
                    </p>
                    <Table>
                      <TableRow gridTemplateColumns={ERROR_COLUMNS}>
                        <TableHeader>Fila</TableHeader>
                        <TableHeader>Error</TableHeader>
                      </TableRow>
                      <For each={p().parsed.errors}>
                        {(err) => (
                          <TableRow gridTemplateColumns={ERROR_COLUMNS}>
                            <TableCell>{err.row}</TableCell>
                            <TableCell ellipsis>{err.message}</TableCell>
                          </TableRow>
                        )}
                      </For>
                    </Table>
                  </div>
                </Show>

                <Show
                  when={p().parsed.valid.length > 0}
                  fallback={
                    <EmptyState
                      title="Sin filas válidas"
                      description="Verifica el formato del archivo."
                    />
                  }
                >
                  <div class={styles.importBlock}>
                    <Table>
                      <TableRow gridTemplateColumns={PREVIEW_COLUMNS}>
                        <TableHeader>Apellidos</TableHeader>
                        <TableHeader>Nombres</TableHeader>
                        <TableHeader>Correo</TableHeader>
                        <TableHeader>Vencimiento</TableHeader>
                        <TableHeader>Categoría</TableHeader>
                      </TableRow>
                      <For each={p().parsed.valid}>
                        {(row) => (
                          <TableRow gridTemplateColumns={PREVIEW_COLUMNS}>
                            <TableCell ellipsis>
                              {row.firstSurname} {row.secondSurname}
                            </TableCell>
                            <TableCell ellipsis>{row.names}</TableCell>
                            <TableCell ellipsis>{row.email}</TableCell>
                            <TableCell>
                              {row.expiresAt
                                ? new Date(row.expiresAt).toLocaleDateString(
                                    APP_LOCALE,
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {row.executiveCategory ?? "—"}
                            </TableCell>
                          </TableRow>
                        )}
                      </For>
                    </Table>
                    <div class={styles.inviteActions}>
                      <Button
                        type="button"
                        disabled={isImporting()}
                        onClick={() => {
                          void handleImport();
                        }}
                      >
                        {isImporting()
                          ? "Importando..."
                          : `Crear ${p().parsed.valid.length} usuario(s)`}
                      </Button>
                    </div>
                  </div>
                </Show>
              </>
            )}
          </Show>

          <Show when={result()}>
            {(r) => (
              <div class={styles.importBlock}>
                <p class={styles.importNote}>
                  Importación completada: {r().created} creado(s), {r().skipped}{" "}
                  omitido(s).
                </p>
                <Show when={r().rowErrors.length > 0}>
                  <Table>
                    <TableRow>
                      <TableHeader>Error</TableHeader>
                    </TableRow>
                    <For each={r().rowErrors}>
                      {(err) => (
                        <TableRow>
                          <TableCell ellipsis>{err}</TableCell>
                        </TableRow>
                      )}
                    </For>
                  </Table>
                </Show>
              </div>
            )}
          </Show>
        </SettingsSection>
      )}
    </Show>
  );
}
