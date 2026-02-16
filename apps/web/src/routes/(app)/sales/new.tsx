import { useNavigate, useSearchParams } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";

import {
  addSaleDocument,
  addSaleItem,
  createSale,
  getAvailableInventory,
  getAvailableProducts,
  getSaleDraftContext,
  lockSaleInventory,
  submitSale,
} from "~/actions/sales";
import { useToast } from "~/components/feedback/toast-provider";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { getErrorMessage } from "~/lib/errors";
import { runOptimistic } from "~/lib/ui/run-optimistic";

export default function NewSalePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [contactId, setContactId] = createSignal(
    searchParams.contactId?.toString() || "",
  );
  const [noteId, setNoteId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [selectedProductId, setSelectedProductId] = createSignal("");
  const [quantity, setQuantity] = createSignal("1");
  const [selectedInventoryId, setSelectedInventoryId] = createSignal("");
  const [docName, setDocName] = createSignal("dni-frente.pdf");
  const [docType, setDocType] = createSignal("application/pdf");
  const [docSizeKb, setDocSizeKb] = createSignal("400");
  const { showToast } = useToast();

  const [products] = createResource(
    () => true,
    async () => getAvailableProducts(),
    { initialValue: [], ssrLoadFrom: "initial" },
  );
  const currentProducts = () => products.latest ?? [];
  const [inventory, { refetch: refetchInventory }] = createResource(
    () => true,
    async () => getAvailableInventory(),
    { initialValue: [], ssrLoadFrom: "initial" },
  );
  const currentInventory = () => inventory.latest ?? [];
  const [draft, { refetch: refetchDraft, mutate: mutateDraft }] =
    createResource(noteId, getSaleDraftContext);
  const currentDraft = () => draft.latest;

  async function handleCreate(e: Event) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createSale(Number(contactId()));
      setNoteId(res.id);
      showToast("success", `Nota de cargo #${res.id} creada`);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Error al crear venta"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem() {
    const currentNoteId = noteId();
    if (!currentNoteId || !selectedProductId()) return;
    const product = currentProducts().find(
      (it) => it.id === Number(selectedProductId()),
    );
    if (!product) return;
    try {
      const safeQuantity = Number(quantity());
      await runOptimistic({
        read: currentDraft,
        write: (next) => {
          mutateDraft(() => next);
        },
        optimistic: (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: [
              {
                id: -Date.now(),
                charge_note_id: currentNoteId,
                product_id: product.id,
                quantity: safeQuantity,
                product_name: product.name,
                product_category: product.category,
              },
              ...prev.items,
            ],
            readiness: { ...prev.readiness, hasItems: true },
          };
        },
        commit: async () => {
          await addSaleItem(currentNoteId, product.id, safeQuantity);
        },
        reconcile: () => {
          void refetchDraft();
        },
      });
      showToast("success", "Producto agregado");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "No se pudo agregar producto"));
    }
  }

  async function handleAddDocument() {
    const currentNoteId = noteId();
    if (!currentNoteId) return;
    try {
      const size = Number(docSizeKb()) * 1024;
      await runOptimistic({
        read: currentDraft,
        write: (next) => {
          mutateDraft(() => next);
        },
        optimistic: (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            documents: [
              {
                id: -Date.now(),
                charge_note_id: currentNoteId,
                filename: docName(),
                filepath: `pending://${docName()}`,
                mimetype: docType(),
                size,
                version: 1,
                created_at: Date.now(),
              },
              ...prev.documents,
            ],
            readiness: { ...prev.readiness, hasDocuments: true },
          };
        },
        commit: async () => {
          await addSaleDocument(currentNoteId, docName(), docType(), size);
        },
        reconcile: () => {
          void refetchDraft();
        },
      });
      showToast("success", "Documento registrado");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo registrar documento"),
      );
    }
  }

  async function handleLockInventory() {
    const currentNoteId = noteId();
    if (!currentNoteId || !selectedInventoryId()) return;
    const selected = currentInventory().find(
      (item) => item.id === Number(selectedInventoryId()),
    );
    if (!selected) return;
    try {
      const selectedId = selected.id;
      await runOptimistic({
        read: currentDraft,
        write: (next) => {
          mutateDraft(() => next);
        },
        optimistic: (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            inventoryLock: {
              id: -Date.now(),
              inventory_item_id: selectedId,
              charge_note_id: currentNoteId,
              locked_at: Date.now(),
              expires_at: Date.now() + 30 * 60 * 1000,
              serial_number: selected.serial_number,
              inventory_status: "reserved" as const,
            },
            readiness: { ...prev.readiness, hasInventoryLock: true },
          };
        },
        commit: async () => {
          await lockSaleInventory(currentNoteId, selectedId);
        },
        reconcile: async () => {
          await Promise.all([refetchDraft(), refetchInventory()]);
        },
      });
      showToast("success", "Equipo reservado");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo reservar inventario"),
      );
    }
  }

  async function handleSubmit() {
    const currentNoteId = noteId();
    if (!currentNoteId) return;
    setLoading(true);
    try {
      await submitSale(currentNoteId);
      showToast("success", "Nota enviada a revisión");
      navigate("/leads");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Error al enviar"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Nueva venta</h1>
        <Button variant="secondary" onClick={() => navigate("/leads")}>
          Cancelar
        </Button>
      </div>

      <Show when={!noteId()}>
        <Card>
          <div class="p-6">
            <form
              onSubmit={(e) => {
                void handleCreate(e);
              }}
              class="space-y-4 max-w-md"
            >
              <Input
                type="number"
                label="ID del Contacto"
                value={contactId()}
                onInput={(e) => setContactId(e.currentTarget.value)}
                required
              />
              <Button type="submit" disabled={loading()}>
                {loading() ? "Creando..." : "Crear nota de cargo"}
              </Button>
            </form>
          </div>
        </Card>
      </Show>

      <Show when={noteId()}>
        <Card>
          <div class="p-6 space-y-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">
                Nota de cargo #{noteId()}
              </h3>
              <p class="text-sm text-gray-500 mt-1">
                Debe tener productos, documentos y equipo bloqueado.
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <div class="space-y-2 rounded border p-3">
                <p class="text-sm font-medium">Productos</p>
                <select
                  class="w-full rounded border px-2 py-2 text-sm"
                  value={selectedProductId()}
                  onInput={(e) => setSelectedProductId(e.currentTarget.value)}
                >
                  <option value="">Seleccionar producto</option>
                  <For each={currentProducts()}>
                    {(product) => (
                      <option value={product.id}>{product.name}</option>
                    )}
                  </For>
                </select>
                <Input
                  type="number"
                  label="Cantidad"
                  value={quantity()}
                  min="1"
                  onInput={(e) => setQuantity(e.currentTarget.value)}
                />
                <Button
                  onClick={() => {
                    void handleAddItem();
                  }}
                >
                  Agregar
                </Button>
              </div>

              <div class="space-y-2 rounded border p-3">
                <p class="text-sm font-medium">Documento manual</p>
                <Input
                  label="Archivo"
                  value={docName()}
                  onInput={(e) => setDocName(e.currentTarget.value)}
                />
                <Input
                  label="Tipo MIME"
                  value={docType()}
                  onInput={(e) => setDocType(e.currentTarget.value)}
                />
                <Input
                  type="number"
                  label="Tamaño (KB)"
                  value={docSizeKb()}
                  onInput={(e) => setDocSizeKb(e.currentTarget.value)}
                />
                <Button
                  onClick={() => {
                    void handleAddDocument();
                  }}
                >
                  Registrar
                </Button>
              </div>

              <div class="space-y-2 rounded border p-3">
                <p class="text-sm font-medium">Equipo (S/N)</p>
                <select
                  class="w-full rounded border px-2 py-2 text-sm"
                  value={selectedInventoryId()}
                  onInput={(e) => setSelectedInventoryId(e.currentTarget.value)}
                >
                  <option value="">Seleccionar serial</option>
                  <For each={currentInventory()}>
                    {(item) => (
                      <option value={item.id}>
                        {item.serial_number} - {item.product_name}
                      </option>
                    )}
                  </For>
                </select>
                <Button
                  onClick={() => {
                    void handleLockInventory();
                  }}
                >
                  Reservar
                </Button>
              </div>
            </div>

            <Show when={currentDraft()}>
              {(ctx) => (
                <div class="rounded border p-3 text-sm space-y-1">
                  <p>Items: {ctx().items.length}</p>
                  <p>Documentos: {ctx().documents.length}</p>
                  <p>
                    Inventario bloqueado:{" "}
                    {ctx().inventoryLock?.serial_number ?? "No"}
                  </p>
                </div>
              )}
            </Show>

            <div class="flex justify-end">
              <Button
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={loading()}
              >
                {loading() ? "Enviando..." : "Enviar a validación"}
              </Button>
            </div>
          </div>
        </Card>
      </Show>
    </div>
  );
}
