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
  removeSaleDocument,
  submitSale,
} from "~/actions/sales";
import { useToast } from "~/components/feedback/toast-provider";
import {
  AppPage,
  AppPageHeader,
} from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { FileInput } from "~/components/ui/input/file-input";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
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
  const [selectedDocumentFile, setSelectedDocumentFile] =
    createSignal<File | null>(null);
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
      showToast("success", `Sales note #${res.id} created`);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to create sale"));
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
      showToast("success", "Item added");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to add item"));
    }
  }

  async function handleAddDocument() {
    const currentNoteId = noteId();
    const file = selectedDocumentFile();
    if (!currentNoteId || !file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
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
                original_name: file.name,
                mime_type: file.type,
                size_bytes: file.size,
                blob_sha256: "pending",
                status: "available" as const,
                created_by_user_id: -1,
                created_at: Date.now(),
                deleted_at: null,
              },
              ...prev.documents,
            ],
            readiness: { ...prev.readiness, hasDocuments: true },
          };
        },
        commit: async () => {
          await addSaleDocument(
            currentNoteId,
            file.name,
            file.type || "application/octet-stream",
            bytes,
          );
        },
        reconcile: () => {
          void refetchDraft();
        },
      });
      setSelectedDocumentFile(null);
      showToast("success", "Document uploaded");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to upload document"));
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
      showToast("success", "Inventory reserved");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to reserve inventory"));
    }
  }

  async function handleRemoveDocument(documentId: number) {
    const currentNoteId = noteId();
    if (!currentNoteId) return;

    try {
      await runOptimistic({
        read: currentDraft,
        write: (next) => {
          mutateDraft(() => next);
        },
        optimistic: (prev) => {
          if (!prev) return prev;
          const remaining = prev.documents.filter(
            (doc) => doc.id !== documentId,
          );
          return {
            ...prev,
            documents: remaining,
            readiness: {
              ...prev.readiness,
              hasDocuments: remaining.length > 0,
            },
          };
        },
        commit: async () => {
          await removeSaleDocument(currentNoteId, documentId);
        },
        reconcile: () => {
          void refetchDraft();
        },
      });
      showToast("success", "Document removed");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to remove document"));
    }
  }

  async function handleSubmit() {
    const currentNoteId = noteId();
    if (!currentNoteId) return;
    setLoading(true);
    try {
      await submitSale(currentNoteId);
      showToast("success", "Sales note submitted");
      navigate("/leads");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Submit failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppPage class="mx-auto max-w-4xl">
      <AppPageHeader
        eyebrow="Sales"
        title="New sale"
        description="Create a sales note with items, documents, and reserved inventory."
        actions={
          <Button variant="secondary" onClick={() => navigate("/leads")}>
            Cancel
          </Button>
        }
      />

      <Show when={!noteId()}>
        <section class="tw-record-index-panel p-4">
          <form
            onSubmit={(e) => {
              void handleCreate(e);
            }}
            class="max-w-md space-y-4"
          >
            <Input
              type="number"
              label="Contact ID"
              value={contactId()}
              onInput={(e) => setContactId(e.currentTarget.value)}
              required
            />
            <Button type="submit" disabled={loading()}>
              {loading() ? "Creating..." : "Create sales note"}
            </Button>
          </form>
        </section>
      </Show>

      <Show when={noteId()}>
        <section class="tw-record-index-panel space-y-6 p-4">
          <div>
            <h3 class="text-lg font-semibold text-foreground">
              Sales note #{noteId()}
            </h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Requires items, documents, and locked inventory before submit.
            </p>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div class="space-y-2 border border-border px-3 py-2">
              <p class="text-sm font-medium">Items</p>
              <Select
                value={selectedProductId()}
                onInput={(e) => setSelectedProductId(e.currentTarget.value)}
              >
                <option value="">Select product</option>
                <For each={currentProducts()}>
                  {(product) => (
                    <option value={product.id}>{product.name}</option>
                  )}
                </For>
              </Select>
              <Input
                type="number"
                label="Quantity"
                value={quantity()}
                min="1"
                onInput={(e) => setQuantity(e.currentTarget.value)}
              />
              <Button
                onClick={() => {
                  void handleAddItem();
                }}
              >
                Add item
              </Button>
            </div>

            <div class="space-y-2 border border-border px-3 py-2">
              <p class="text-sm font-medium">Document</p>
              <FileInput
                label="File"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                onInput={(e) => {
                  setSelectedDocumentFile(e.currentTarget.files?.[0] ?? null);
                }}
              />
              <Button
                onClick={() => {
                  void handleAddDocument();
                }}
                disabled={!selectedDocumentFile()}
              >
                Upload document
              </Button>
            </div>

            <div class="space-y-2 border border-border px-3 py-2">
              <p class="text-sm font-medium">Inventory serial</p>
              <Select
                value={selectedInventoryId()}
                onInput={(e) => setSelectedInventoryId(e.currentTarget.value)}
              >
                <option value="">Select serial</option>
                <For each={currentInventory()}>
                  {(item) => (
                    <option value={item.id}>
                      {item.serial_number} - {item.product_name}
                    </option>
                  )}
                </For>
              </Select>
              <Button
                onClick={() => {
                  void handleLockInventory();
                }}
              >
                Reserve inventory
              </Button>
            </div>
          </div>

          <Show when={currentDraft()}>
            {(ctx) => (
              <div class="space-y-2 border border-border px-3 py-2 text-sm">
                <p>Items: {ctx().items.length}</p>
                <p>Documents: {ctx().documents.length}</p>
                <p class="text-sm font-medium">Items</p>
                <p>
                  Inventory locked: {ctx().inventoryLock?.serial_number ?? "No"}
                </p>
                <Show when={ctx().documents.length > 0}>
                  <ul class="space-y-1">
                    <For each={ctx().documents}>
                      {(document) => (
                        <li class="flex items-center justify-between rounded-sm border border-border/80 bg-surface px-2 py-1">
                          <span>
                            {document.original_name} (
                            {Math.ceil(document.size_bytes / 1024)} KB)
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              void handleRemoveDocument(document.id);
                            }}
                          >
                            Remove
                          </Button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
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
              {loading() ? "Submitting..." : "Submit for review"}
            </Button>
          </div>
        </section>
      </Show>
    </AppPage>
  );
}
