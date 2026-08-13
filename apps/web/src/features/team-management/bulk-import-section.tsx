import { createAsync } from "@solidjs/router";
import { For, Show, createEffect, createSignal, on } from "solid-js";

import { readFileText } from "~/browser/file/read-file-text";
import { EmptyState } from "~/components/feedback/empty-state/empty";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { FileInput } from "~/components/ui/input/file-input";
import { Select } from "~/components/ui/input/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { actionErrorMessage } from "~/contracts/errors";
import type {
  BulkApplyResult,
  BulkPreviewResult,
} from "~/contracts/team/bulk-import";
import { formatCalendarDate } from "~/domain/time/app-time";
import { bulkImportSetupQuery } from "~/rpc/team-management/bulk-import-setup";
import { applyBulkImport, previewBulkCsv } from "~/rpc/team/bulk-import";

import styles from "./team-management.module.css";

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
    on(bulkImportSetup, (setup) => {
      if (!setup) {
        return;
      }
      if (!setup.assignableRoles.some((option) => option.value === role())) {
        setRole(setup.assignableRoles[0]?.value ?? "");
      }
    }),
  );

  async function handlePreview(): Promise<void> {
    const file = csvFile();
    if (!file || !role()) {
      return;
    }
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
    if (!file || !role()) {
      return;
    }
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
      {(setup) => (
        <SettingsSection
          title="Importar desde CSV"
          description="Carga un archivo CSV con las columnas, en este orden: FIRST_SURNAME, SECOND_SURNAME, NAMES, EMAIL. Para ejecutivos agrega también DATE_EXPIRY y EXECUTIVE_CATEGORY (elite o corporativa)."
        >
          <form
            class={styles.inviteForm}
            onSubmit={(event) => {
              event.preventDefault();
              void handlePreview();
            }}
          >
            <div class={styles.inviteFormRow}>
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
                required
              >
                <For each={setup.assignableRoles}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </Select>
            </div>
            <div class={styles.inviteActions}>
              <Button
                type="submit"
                variant="outline"
                disabled={!csvFile() || !role() || isPreviewing()}
                loading={isPreviewing()}
              >
                Previsualizar
              </Button>
            </div>
          </form>

          <Show when={preview()}>
            {(previewData) => (
              <>
                <Show when={previewData().parsed.errors.length > 0}>
                  <div class={styles.importBlock}>
                    <p class={styles.importNote}>
                      {previewData().parsed.errors.length} fila(s) con errores
                      (serán omitidas):
                    </p>
                    <Table variant="list">
                      <colgroup>
                        <col style={{ width: "64px" }} />
                        <col />
                      </colgroup>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fila</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <For each={previewData().parsed.errors}>
                          {(rowError) => (
                            <TableRow>
                              <TableCell>{rowError.row}</TableCell>
                              <TableCell ellipsis>{rowError.message}</TableCell>
                            </TableRow>
                          )}
                        </For>
                      </TableBody>
                    </Table>
                  </div>
                </Show>

                <Show
                  when={previewData().parsed.valid.length > 0}
                  fallback={
                    <EmptyState
                      title="Sin filas válidas"
                      description="Verifica el formato del archivo."
                    />
                  }
                >
                  <div class={styles.importBlock}>
                    <Table variant="list">
                      <colgroup>
                        <col style={{ width: "24%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "32%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "20%" }} />
                      </colgroup>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Apellidos</TableHead>
                          <TableHead>Nombres</TableHead>
                          <TableHead>Correo</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Categoría</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <For each={previewData().parsed.valid}>
                          {(row) => (
                            <TableRow>
                              <TableCell ellipsis>
                                {row.firstSurname} {row.secondSurname}
                              </TableCell>
                              <TableCell ellipsis>{row.names}</TableCell>
                              <TableCell ellipsis>{row.email}</TableCell>
                              <TableCell>
                                {row.expiresOn
                                  ? formatCalendarDate(row.expiresOn)
                                  : null}
                              </TableCell>
                              <TableCell>{row.executiveCategory}</TableCell>
                            </TableRow>
                          )}
                        </For>
                      </TableBody>
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
                          : `Crear ${previewData().parsed.valid.length} usuario(s)`}
                      </Button>
                    </div>
                  </div>
                </Show>
              </>
            )}
          </Show>

          <Show when={result()}>
            {(importResult) => (
              <div class={styles.importBlock}>
                <p class={styles.importNote}>
                  Importación completada: {importResult().created} creado(s),{" "}
                  {importResult().skipped} omitido(s).
                </p>
                <Show when={importResult().rowErrors.length > 0}>
                  <Table variant="list">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <For each={importResult().rowErrors}>
                        {(rowError) => (
                          <TableRow>
                            <TableCell ellipsis>{rowError}</TableCell>
                          </TableRow>
                        )}
                      </For>
                    </TableBody>
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
