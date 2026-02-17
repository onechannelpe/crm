import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

import { searchClients } from "~/actions/client-search";
import {
  createClientSearchView,
  deleteClientSearchView,
  listClientSearchViews,
  setDefaultClientSearchView,
  updateClientSearchView,
  type ClientSearchView,
} from "~/actions/client-search-views";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import Search from "~/components/icons/search";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { getErrorMessage } from "~/lib/errors";
import {
  SEARCH_TYPES,
  type SearchResult,
  type SearchType,
} from "~/server/shared/engine/types";

const SEARCH_LABELS = {
  dni: "DNI",
  ruc: "RUC",
  phone: "Teléfono",
  person_name: "Nombre de persona",
  company_name: "Nombre de empresa",
  phone_enriched: "Teléfono enriquecido",
} as const satisfies Record<SearchType, string>;

const SEARCH_HELP = {
  dni: "Busca por DNI de 8 a 12 dígitos.",
  ruc: "Busca por RUC exacto de 11 dígitos.",
  phone: "Busca por teléfono de 7 a 15 dígitos.",
  person_name: "Busca por nombre de persona (mínimo 2 caracteres).",
  company_name: "Busca por nombre de empresa (mínimo 2 caracteres).",
  phone_enriched: "Busca por teléfono y devuelve teléfonos relacionados.",
} as const satisfies Record<SearchType, string>;

function isSearchType(value: string): value is SearchType {
  return SEARCH_TYPES.some((type) => type === value);
}

function rowKey(item: SearchResult): string {
  return `${item.dni}|${item.name}|${item.org_ruc ?? ""}|${item.phone_primary ?? ""}`;
}

function csvCell(value: string | null | undefined): string {
  const raw = value ?? "";
  return `"${raw.replaceAll('"', '""')}"`;
}

function triggerCsvDownload(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

export default function ClientSearchPage() {
  const { showToast } = useToast();
  let queryInputRef: HTMLInputElement | undefined;

  const [searchType, setSearchType] = createSignal<SearchType>("dni");
  const [query, setQuery] = createSignal("");
  const [limit, setLimit] = createSignal("20");
  const [searching, setSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [results, setResults] = createSignal<SearchResult[]>([]);
  const [resultCount, setResultCount] = createSignal(0);
  const [searched, setSearched] = createSignal(false);

  const [selectedKeys, setSelectedKeys] = createSignal<Set<string>>(new Set());

  const [views, { refetch: refetchViews }] = createResource(
    () => true,
    async () => listClientSearchViews(),
    { initialValue: [], ssrLoadFrom: "initial" },
  );
  const currentViews = () => views.latest ?? [];
  const [selectedViewId, setSelectedViewId] = createSignal<number | null>(null);
  const [viewName, setViewName] = createSignal("");
  const [savingView, setSavingView] = createSignal(false);
  const [initializedDefault, setInitializedDefault] = createSignal(false);

  const selectedRows = createMemo(() => {
    const keys = selectedKeys();
    return results().filter((item) => keys.has(rowKey(item)));
  });
  const selectedCount = createMemo(() => selectedRows().length);
  const allVisibleSelected = createMemo(() => {
    const keys = selectedKeys();
    const items = results();
    if (items.length === 0) return false;
    return items.every((item) => keys.has(rowKey(item)));
  });
  const querySummary = createMemo(() => {
    if (!searched()) return "Define filtros y ejecuta una búsqueda.";
    return `${resultCount()} resultados para ${SEARCH_LABELS[searchType()]}: "${query().trim()}"`;
  });

  createEffect(() => {
    if (initializedDefault()) return;
    const defaultView = currentViews().find((view) => view.isDefault);
    if (!defaultView) return;
    setInitializedDefault(true);
    applyView(defaultView, false);
  });

  const executeSearch = async (
    type: SearchType,
    value: string,
    limitValue: number,
  ) => {
    setSearching(true);
    setError(null);

    try {
      const response = await searchClients(type, value, limitValue);
      setResults(response.results);
      setResultCount(response.count);
      setSearched(true);
      setSelectedKeys(new Set<string>());
    } catch (searchError: unknown) {
      setResults([]);
      setResultCount(0);
      setSearched(true);
      setSelectedKeys(new Set<string>());
      setError(
        getErrorMessage(searchError, "No se pudo completar la búsqueda"),
      );
    } finally {
      setSearching(false);
    }
  };

  const runSearch = async (event: SubmitEvent) => {
    event.preventDefault();
    const parsedLimit = Number.parseInt(limit(), 10);
    await executeSearch(searchType(), query(), parsedLimit);
  };

  const handleSearch = (event: SubmitEvent) => {
    void runSearch(event);
  };

  const toggleRow = (item: SearchResult) => {
    const key = rowKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    const allSelected = allVisibleSelected();
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const item of results()) {
        const key = rowKey(item);
        if (allSelected) {
          next.delete(key);
        } else {
          next.add(key);
        }
      }
      return next;
    });
  };

  const copyPhones = async () => {
    const unique = new Set<string>();
    for (const item of selectedRows()) {
      if (item.phone_primary) unique.add(item.phone_primary);
      if (item.phone_secondary) unique.add(item.phone_secondary);
      for (const phone of item.sibling_phones ?? []) {
        unique.add(phone);
      }
    }
    const payload = [...unique].join("\n");
    if (!payload) {
      showToast("error", "Los seleccionados no tienen teléfonos para copiar");
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
      showToast("success", `${unique.size} teléfonos copiados`);
    } catch {
      showToast("error", "No se pudo copiar al portapapeles");
    }
  };

  const copyDnis = async () => {
    const payload = selectedRows()
      .map((item) => item.dni)
      .join("\n");
    if (!payload) {
      showToast("error", "No hay DNIs para copiar");
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
      showToast("success", `${selectedCount()} DNIs copiados`);
    } catch {
      showToast("error", "No se pudo copiar al portapapeles");
    }
  };

  const exportSelectedCsv = () => {
    const rows = selectedRows();
    if (rows.length === 0) {
      showToast("error", "Selecciona al menos un resultado");
      return;
    }
    const header = [
      "dni",
      "name",
      "org_ruc",
      "org_name",
      "phone_primary",
      "phone_secondary",
      "sibling_phones",
    ].join(",");
    const body = rows
      .map((item) =>
        [
          csvCell(item.dni),
          csvCell(item.name),
          csvCell(item.org_ruc),
          csvCell(item.org_name),
          csvCell(item.phone_primary),
          csvCell(item.phone_secondary),
          csvCell((item.sibling_phones ?? []).join(";")),
        ].join(","),
      )
      .join("\n");
    triggerCsvDownload(
      `client-search-${new Date().toISOString().slice(0, 10)}.csv`,
      `${header}\n${body}`,
    );
    showToast("success", `CSV exportado con ${rows.length} registros`);
  };

  const applyView = (view: ClientSearchView, shouldRunSearch = true) => {
    setSelectedViewId(view.id);
    setViewName(view.name);
    setSearchType(view.searchType);
    setQuery(view.queryValue);
    setLimit(String(view.limitValue));
    if (shouldRunSearch) {
      void executeSearch(view.searchType, view.queryValue, view.limitValue);
    }
  };

  const handleSaveView = async () => {
    const name = viewName().trim();
    if (!name) {
      showToast("error", "Ingresa un nombre para la vista");
      return;
    }
    setSavingView(true);
    try {
      const selectedId = selectedViewId();
      if (selectedId === null) {
        const created = await createClientSearchView(
          name,
          searchType(),
          query(),
          Number.parseInt(limit(), 10),
          false,
        );
        setSelectedViewId(created.id);
      } else {
        await updateClientSearchView(
          selectedId,
          name,
          searchType(),
          query(),
          Number.parseInt(limit(), 10),
        );
      }
      await refetchViews();
      showToast("success", "Vista guardada");
    } catch (saveError: unknown) {
      showToast("error", getErrorMessage(saveError, "No se pudo guardar"));
    } finally {
      setSavingView(false);
    }
  };

  const handleDeleteView = async () => {
    const selectedId = selectedViewId();
    if (selectedId === null) return;
    setSavingView(true);
    try {
      await deleteClientSearchView(selectedId);
      setSelectedViewId(null);
      setViewName("");
      await refetchViews();
      showToast("success", "Vista eliminada");
    } catch (deleteError: unknown) {
      showToast("error", getErrorMessage(deleteError, "No se pudo eliminar"));
    } finally {
      setSavingView(false);
    }
  };

  const handleSetDefault = async () => {
    const selectedId = selectedViewId();
    if (selectedId === null) return;
    setSavingView(true);
    try {
      await setDefaultClientSearchView(selectedId);
      await refetchViews();
      showToast("success", "Vista marcada como predeterminada");
    } catch (setDefaultError: unknown) {
      showToast(
        "error",
        getErrorMessage(
          setDefaultError,
          "No se pudo guardar el predeterminado",
        ),
      );
    } finally {
      setSavingView(false);
    }
  };

  onMount(() => {
    const handler = (event: KeyboardEvent) => {
      const editable = isEditableTarget(event.target);

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !editable) {
        event.preventDefault();
        queryInputRef?.focus();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void executeSearch(searchType(), query(), Number.parseInt(limit(), 10));
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const index = Number.parseInt(event.key, 10);
        if (
          Number.isInteger(index) &&
          index >= 1 &&
          index <= SEARCH_TYPES.length
        ) {
          event.preventDefault();
          setSearchType(SEARCH_TYPES[index - 1]);
          return;
        }
      }

      if (event.shiftKey && event.key.toLowerCase() === "a" && !editable) {
        event.preventDefault();
        toggleAllVisible();
        return;
      }

      if (event.key.toLowerCase() === "e" && !editable && selectedCount() > 0) {
        event.preventDefault();
        exportSelectedCsv();
        return;
      }

      if (event.key.toLowerCase() === "c" && !editable && selectedCount() > 0) {
        event.preventDefault();
        void copyPhones();
      }
    };

    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  return (
    <div class="space-y-6 pb-28 md:pb-8">
      <div class="crm-surface rounded-3xl p-6 md:p-7">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Workbench
        </p>
        <h1 class="mt-1 text-3xl font-semibold text-foreground md:text-4xl">
          Búsqueda de clientes
        </h1>
        <p class="mt-2 max-w-[760px] text-sm text-muted-foreground md:text-base">
          Filtros persistentes, vistas guardadas y acciones masivas para
          ejecutar búsquedas operativas sin fricción.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        <aside class="space-y-4">
          <div class="crm-surface rounded-3xl p-4 md:p-5">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Filtros
              </h2>
              <Badge variant="outline" class="text-[11px]">
                {SEARCH_LABELS[searchType()]}
              </Badge>
            </div>

            <form class="space-y-4" onSubmit={handleSearch}>
              <Select
                label="Tipo de búsqueda"
                value={searchType()}
                onInput={(event) => {
                  const nextType = event.currentTarget.value;
                  if (!isSearchType(nextType)) return;
                  setSearchType(nextType);
                }}
              >
                <For each={SEARCH_TYPES}>
                  {(type) => (
                    <option value={type}>{SEARCH_LABELS[type]}</option>
                  )}
                </For>
              </Select>

              <Input
                ref={(element) => {
                  queryInputRef = element;
                }}
                label="Valor"
                placeholder="Ingresa valor de búsqueda"
                value={query()}
                onInput={(event) => setQuery(event.currentTarget.value)}
                required
              />

              <Input
                label="Límite"
                type="number"
                min="1"
                max="100"
                value={limit()}
                onInput={(event) => setLimit(event.currentTarget.value)}
                required
              />

              <p class="rounded-2xl bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
                {SEARCH_HELP[searchType()]}
              </p>

              <Button type="submit" class="w-full" disabled={searching()}>
                <Show when={searching()} fallback="Buscar clientes">
                  Buscando...
                </Show>
              </Button>
            </form>

            <p class="mt-3 text-[11px] text-muted-foreground">
              Atajos: `/` foco, `Ctrl/Cmd+Enter` buscar, `Alt+1..6` tipo.
            </p>
          </div>

          <div class="crm-surface rounded-3xl p-4 md:p-5">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Vistas guardadas
              </h2>
              <Badge variant="outline" class="text-[11px]">
                {currentViews().length}
              </Badge>
            </div>

            <div class="space-y-2">
              <Input
                label="Nombre de vista"
                value={viewName()}
                onInput={(event) => setViewName(event.currentTarget.value)}
                placeholder="Ej: Prospectos Lima"
              />
              <div class="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingView()}
                  onClick={() => {
                    void handleSaveView();
                  }}
                >
                  {selectedViewId() ? "Actualizar" : "Guardar"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={savingView() || selectedViewId() === null}
                  onClick={() => {
                    void handleSetDefault();
                  }}
                >
                  Predeterminada
                </Button>
              </div>
              <Button
                size="sm"
                variant="destructive"
                class="w-full"
                disabled={savingView() || selectedViewId() === null}
                onClick={() => {
                  void handleDeleteView();
                }}
              >
                Eliminar vista
              </Button>
            </div>

            <div class="mt-4 max-h-64 space-y-2 overflow-auto border-t border-border/70 pt-4">
              <For each={currentViews()}>
                {(view) => (
                  <button
                    type="button"
                    class={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition-colors ${selectedViewId() === view.id ? "border-primary bg-primary/5" : "border-border/70 bg-white/70 hover:bg-secondary/70"}`}
                    onClick={() => applyView(view)}
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="truncate font-medium">{view.name}</span>
                      <Show when={view.isDefault}>
                        <Badge variant="outline" class="text-[10px]">
                          Default
                        </Badge>
                      </Show>
                    </div>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {SEARCH_LABELS[view.searchType]} · {view.queryValue}
                    </p>
                  </button>
                )}
              </For>
              <Show when={currentViews().length === 0}>
                <p class="text-xs text-muted-foreground">
                  Aún no tienes vistas guardadas.
                </p>
              </Show>
            </div>
          </div>
        </aside>

        <section class="space-y-3">
          <div class="crm-surface rounded-3xl p-4 md:p-5">
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div class="flex items-center gap-2">
                <Search class="h-4 w-4 text-muted-foreground" />
                <p class="text-sm text-muted-foreground">{querySummary()}</p>
              </div>
              <div class="flex items-center gap-2">
                <Show when={searched()}>
                  <Badge variant="outline" class="text-[11px]">
                    {resultCount()} resultados
                  </Badge>
                </Show>
                <Show when={selectedCount() > 0}>
                  <Badge variant="secondary" class="text-[11px]">
                    {selectedCount()} seleccionados
                  </Badge>
                </Show>
              </div>
            </div>
          </div>

          <Show when={error()}>
            {(message) => (
              <div class="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {message()}
              </div>
            )}
          </Show>

          <Show when={searched() && !error() && resultCount() === 0}>
            <EmptyState
              title="Sin resultados"
              description="No se encontraron clientes con los filtros indicados."
            />
          </Show>

          <Show when={results().length > 0}>
            <div class="space-y-2">
              <div class="flex items-center justify-between rounded-2xl border border-border/70 bg-white/70 px-3 py-2">
                <label class="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected()}
                    onChange={() => toggleAllVisible()}
                  />
                  Seleccionar visibles
                </label>
                <p class="text-xs text-muted-foreground">
                  Atajos: `Shift+A` seleccionar, `E` exportar, `C` copiar
                  teléfonos
                </p>
              </div>

              <For each={results()}>
                {(item) => (
                  <article class="crm-surface rounded-3xl px-4 py-4 md:px-5">
                    <div class="grid gap-3 md:grid-cols-[auto_1.2fr_1fr_1fr]">
                      <div class="pt-1">
                        <input
                          type="checkbox"
                          checked={selectedKeys().has(rowKey(item))}
                          onChange={() => toggleRow(item)}
                          aria-label={`Seleccionar ${item.name}`}
                        />
                      </div>
                      <div class="space-y-1">
                        <p class="text-base font-semibold text-foreground">
                          {item.name}
                        </p>
                        <p class="text-xs text-muted-foreground">
                          DNI {item.dni}
                        </p>
                      </div>
                      <div class="space-y-1">
                        <p class="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                          Empresa
                        </p>
                        <p class="text-sm text-foreground">
                          {item.org_name ?? "Sin empresa"}
                        </p>
                        <p class="text-xs text-muted-foreground">
                          {item.org_ruc ?? "RUC no disponible"}
                        </p>
                      </div>
                      <div class="space-y-1">
                        <p class="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                          Contacto
                        </p>
                        <p class="text-sm text-foreground">
                          {item.phone_primary ?? "Sin teléfono principal"}
                        </p>
                        <p class="text-xs text-muted-foreground">
                          {item.phone_secondary ?? "Sin teléfono secundario"}
                        </p>
                      </div>
                    </div>
                    <Show
                      when={
                        item.sibling_phones && item.sibling_phones.length > 0
                      }
                    >
                      <div class="mt-3 border-t border-border/60 pt-3">
                        <p class="mb-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                          Teléfonos relacionados
                        </p>
                        <div class="flex flex-wrap gap-2">
                          <For each={item.sibling_phones ?? []}>
                            {(phone) => (
                              <span class="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground">
                                {phone}
                              </span>
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>
                  </article>
                )}
              </For>
            </div>
          </Show>
        </section>
      </div>

      <Show when={selectedCount() > 0}>
        <div class="fixed inset-x-3 bottom-3 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/95 px-4 py-3 shadow-lg backdrop-blur md:inset-x-auto md:bottom-6 md:right-6 md:w-[620px]">
          <p class="text-sm text-muted-foreground">
            {selectedCount()} resultados seleccionados
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void copyDnis();
              }}
            >
              Copiar DNI
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void copyPhones();
              }}
            >
              Copiar teléfonos
            </Button>
            <Button size="sm" onClick={() => exportSelectedCsv()}>
              Exportar CSV
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedKeys(new Set())}
            >
              Limpiar
            </Button>
          </div>
        </div>
      </Show>
    </div>
  );
}
