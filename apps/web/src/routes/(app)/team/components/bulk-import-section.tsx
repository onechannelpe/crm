import { createAsync } from "@solidjs/router";
import { For, Show, createEffect, createSignal, on } from "solid-js";

import {
  applyBulkImport,
  previewBulkCsv,
  type BulkApplyResult,
  type BulkPreviewResult,
} from "~/actions/team/bulk-import";
import { EmptyState } from "~/components/feedback/empty-state/empty";
import { useToast } from "~/components/feedback/toast/provider";
import { AppPageSection, AppPageSectionTitle } from "~/components/layout/page";
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
import { getErrorMessage } from "~/lib/errors";
import { readFileText } from "~/lib/file/read-file-text";
import { APP_LOCALE } from "~/lib/locale";
import { bulkImportSetupQuery } from "~/lib/queries/team";

import styles from "../team-page.module.css";

export function BulkImportSection() {
  const bulkImportSetup = createAsync(() => bulkImportSetupQuery());
  const [role, setRole] = createSignal("");
  const [csvFile, setCsvFile] = createSignal<File | null>(null);
  const [preview, setPreview] = createSignal<BulkPreviewResult | null>(null);
  const [result, setResult] = createSignal<BulkApplyResult | null>(null);
  const [isPreviewing, setIsPreviewing] = createSignal(false);
  const [isImporting, setIsImporting] = createSignal(false);
  const { showToast } = useToast();

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
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Error al procesar el archivo"));
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
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Error al importar usuarios"));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Show when={bulkImportSetup()} keyed>
      {(im) => (
        <AppPageSection>
          <AppPageSectionTitle
            title="Importar desde CSV"
            description={`Carga un archivo CSV con columnas: FIRST_SURNAME, SECOND_SURNAME, NAMES, EMAIL, DATE_EXPIRY (opcional), EXECUTIVE_CATEGORY (requerido para ejecutivos: elite o corporativa).`}
          />
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
                  <div class={styles.tableCompact}>
                    <p>
                      {p().parsed.errors.length} fila(s) con errores (serán
                      omitidas):
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fila</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <For each={p().parsed.errors}>
                          {(err) => (
                            <TableRow>
                              <TableCell>{err.row}</TableCell>
                              <TableCell>{err.message}</TableCell>
                            </TableRow>
                          )}
                        </For>
                      </TableBody>
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
                  <Table class={styles.tableCompact}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Apellidos</TableHead>
                        <TableHead>Nombres</TableHead>
                        <TableHead>Correo</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Categoria</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <For each={p().parsed.valid}>
                        {(row) => (
                          <TableRow>
                            <TableCell>
                              {row.firstSurname} {row.secondSurname}
                            </TableCell>
                            <TableCell>{row.names}</TableCell>
                            <TableCell>{row.email}</TableCell>
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
                        : `Crear ${p().parsed.valid.length} usuario(s)`}
                    </Button>
                  </div>
                </Show>
              </>
            )}
          </Show>

          <Show when={result()}>
            {(r) => (
              <div class={styles.tableCompact}>
                <p>
                  Importación completada: {r().created} creado(s), {r().skipped}{" "}
                  omitido(s).
                </p>
                <Show when={r().rowErrors.length > 0}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <For each={r().rowErrors}>
                        {(err) => (
                          <TableRow>
                            <TableCell>{err}</TableCell>
                          </TableRow>
                        )}
                      </For>
                    </TableBody>
                  </Table>
                </Show>
              </div>
            )}
          </Show>
        </AppPageSection>
      )}
    </Show>
  );
}
