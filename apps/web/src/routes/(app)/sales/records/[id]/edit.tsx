import { createAsync, useNavigate, useParams } from "@solidjs/router";
import {
  createEffect,
  createResource,
  createSignal,
  For,
  Show,
} from "solid-js";

import {
  getSalesRecordFixContext,
  submitSalesRecord,
  updateSalesRecordDraft,
} from "~/actions/sales-records";
import { salesRecordProductsQuery } from "~/lib/queries/sales-records";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";
import { getErrorMessage } from "~/lib/errors";

import styles from "../../edit-sale-page.module.css";

interface ProductLine {
  productId: number;
  quantity: number;
}

export default function FixSalePage() {
  const params = useParams();
  const navigate = useNavigate();
  const noteId = () => Number(params.id);
  const [loading, setLoading] = createSignal(false);
  const [initialized, setInitialized] = createSignal(false);
  const [fixNotes, setFixNotes] = createSignal("");

  const [ruc, setRuc] = createSignal("");
  const [companyName, setCompanyName] = createSignal("");
  const [contactName, setContactName] = createSignal("");
  const [dni, setDni] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [installationAddress, setInstallationAddress] = createSignal("");
  const [billingAddress, setBillingAddress] = createSignal("");
  const [referenceAddress, setReferenceAddress] = createSignal("");
  const [selectedProductId, setSelectedProductId] = createSignal("");
  const [selectedProductQty, setSelectedProductQty] = createSignal("1");
  const [productLines, setProductLines] = createSignal<ProductLine[]>([]);

  const [fixContext, { refetch: refetchFixContext }] = createResource(
    noteId,
    getSalesRecordFixContext,
  );
  const currentProducts = createAsync(() => salesRecordProductsQuery(), {
    initialValue: [],
  });
  const { showToast } = useToast();

  createEffect(() => {
    const context = fixContext();
    if (!context || initialized()) return;

    setRuc(context.client?.ruc ?? "");
    setCompanyName(context.client?.companyName ?? "");
    setContactName(context.client?.contactName ?? "");
    setDni(context.client?.dni ?? "");
    setPhone(context.client?.phones[0] ?? "");

    const installation = context.addresses.find(
      (address) => address.addressType === "installation",
    );
    const billing = context.addresses.find(
      (address) => address.addressType === "billing",
    );
    const reference = context.addresses.find(
      (address) => address.addressType === "reference",
    );
    setInstallationAddress(installation?.fullText ?? "");
    setBillingAddress(billing?.fullText ?? "");
    setReferenceAddress(reference?.fullText ?? "");

    setProductLines(
      context.products.map((line) => ({
        productId: line.id,
        quantity: line.quantity,
      })),
    );

    setInitialized(true);
  });

  const canResubmit = () => {
    const status = fixContext()?.status;
    return status === "rejected" || status === "draft";
  };

  function handleAddProductLine() {
    const productId = Number(selectedProductId());
    const quantity = Number(selectedProductQty());
    if (!productId || Number.isNaN(productId)) {
      showToast("error", "Select a product");
      return;
    }
    if (!quantity || Number.isNaN(quantity) || quantity < 1) {
      showToast("error", "Quantity must be at least 1");
      return;
    }
    if (productLines().some((line) => line.productId === productId)) {
      showToast("error", "This product is already in the list");
      return;
    }
    setProductLines((prev) => [...prev, { productId, quantity }]);
    setSelectedProductId("");
    setSelectedProductQty("1");
  }

  function handleRemoveProductLine(productId: number) {
    setProductLines((prev) =>
      prev.filter((line) => line.productId !== productId),
    );
  }

  async function handleResubmit(e: Event) {
    e.preventDefault();
    if (!fixNotes().trim()) {
      showToast("error", "Please describe the corrections made");
      return;
    }
    if (!companyName().trim() || !contactName().trim() || !dni().trim()) {
      showToast("error", "Company, contact, and DNI are required");
      return;
    }
    if (!installationAddress().trim()) {
      showToast("error", "Installation address is required");
      return;
    }
    if (productLines().length < 1) {
      showToast("error", "At least one product is required");
      return;
    }

    setLoading(true);
    try {
      await updateSalesRecordDraft(
        noteId(),
        {
          client: {
            ruc: ruc().trim() || null,
            companyName: companyName().trim(),
            contactName: contactName().trim(),
            dni: dni().trim(),
            phones: phone().trim() ? [phone().trim()] : [],
            engineMatchId: null,
            completenessScore: 0,
          },
          addresses: [
            {
              addressType: "installation",
              fullText: installationAddress().trim(),
              department: null,
              province: null,
              district: null,
              ubigeo: null,
              latitude: null,
              longitude: null,
              isPrimary: true,
            },
            ...(billingAddress().trim()
              ? [
                  {
                    addressType: "billing" as const,
                    fullText: billingAddress().trim(),
                    department: null,
                    province: null,
                    district: null,
                    ubigeo: null,
                    latitude: null,
                    longitude: null,
                    isPrimary: false,
                  },
                ]
              : []),
            ...(referenceAddress().trim()
              ? [
                  {
                    addressType: "reference" as const,
                    fullText: referenceAddress().trim(),
                    department: null,
                    province: null,
                    district: null,
                    ubigeo: null,
                    latitude: null,
                    longitude: null,
                    isPrimary: false,
                  },
                ]
              : []),
          ],
          products: productLines().map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        },
        fixNotes().trim(),
      );
      await submitSalesRecord(noteId());
      await refetchFixContext();
      showToast("success", "Sales record resubmitted");
      navigate("/sales/confirmations");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Resubmit failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppPage width="medium">
      <Show when={fixContext()}>
        <form
          onSubmit={(e) => {
            void handleResubmit(e);
          }}
        >
          <div class={styles.panelPadded}>
            <div class={styles.formBlock}>
              <h2 class={styles.blockTitle}>Client correction</h2>
              <Input
                label="RUC"
                value={ruc()}
                onInput={(e) => setRuc(e.currentTarget.value)}
              />
              <Input
                label="Company"
                value={companyName()}
                onInput={(e) => setCompanyName(e.currentTarget.value)}
                required
              />
              <Input
                label="Contact"
                value={contactName()}
                onInput={(e) => setContactName(e.currentTarget.value)}
                required
              />
              <Input
                label="DNI"
                value={dni()}
                onInput={(e) => setDni(e.currentTarget.value)}
                required
              />
              <Input
                label="Phone"
                value={phone()}
                onInput={(e) => setPhone(e.currentTarget.value)}
              />
              <Input
                label="Installation address"
                value={installationAddress()}
                onInput={(e) => setInstallationAddress(e.currentTarget.value)}
                required
              />
              <Input
                label="Billing address (optional)"
                value={billingAddress()}
                onInput={(e) => setBillingAddress(e.currentTarget.value)}
              />
              <Input
                label="Reference address (optional)"
                value={referenceAddress()}
                onInput={(e) => setReferenceAddress(e.currentTarget.value)}
              />
            </div>

            <div class={styles.formBlock}>
              <h2 class={styles.blockTitle}>Product correction</h2>
              <Select
                value={selectedProductId()}
                onInput={(e) => setSelectedProductId(e.currentTarget.value)}
              >
                <option value="">Select product</option>
                <For each={currentProducts()}>
                  {(product) => (
                    <option value={product.id}>
                      {product.name} - {product.category}
                    </option>
                  )}
                </For>
              </Select>
              <Input
                type="number"
                label="Quantity"
                value={selectedProductQty()}
                min="1"
                onInput={(e) => setSelectedProductQty(e.currentTarget.value)}
              />
              <Button
                type="button"
                onClick={handleAddProductLine}
                disabled={!selectedProductId()}
              >
                Add product
              </Button>
              <Show when={productLines().length > 0}>
                <ul class={styles.rejectionList}>
                  <For each={productLines()}>
                    {(line) => {
                      const product = () =>
                        currentProducts().find(
                          (it) => it.id === line.productId,
                        );
                      return (
                        <li class={styles.rejectionItem}>
                          <p class={styles.rejectionField}>
                            {product()?.name ?? `Product #${line.productId}`}
                          </p>
                          <p class={styles.rejectionNote}>
                            Quantity: {line.quantity}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleRemoveProductLine(line.productId)
                            }
                          >
                            Remove
                          </Button>
                        </li>
                      );
                    }}
                  </For>
                </ul>
              </Show>
            </div>

            <Show when={(fixContext()?.attempts.length ?? 0) > 0}>
              <div class={styles.rejectionBlock}>
                <h2 class={styles.blockTitle}>Back-office attempts</h2>
                <ul class={styles.rejectionList}>
                  <For each={fixContext()?.attempts ?? []}>
                    {(attempt) => (
                      <li class={styles.rejectionItem}>
                        <p class={styles.rejectionField}>
                          {attempt.outcome} - {attempt.reviewerName}
                        </p>
                        <p class={styles.rejectionNote}>
                          {attempt.notes ?? "No notes"}
                        </p>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>

            <div class={styles.formBlock}>
              <h2 class={styles.blockTitle}>Corrections made</h2>
              <Textarea
                label="Correction notes"
                value={fixNotes()}
                onInput={(e) => setFixNotes(e.currentTarget.value)}
                rows={4}
                required
              />
            </div>

            <div class={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/sales/leads")}
              >
                Back to leads
              </Button>
              <Button type="submit" disabled={loading() || !canResubmit()}>
                {loading() ? "Submitting..." : "Resubmit for approval"}
              </Button>
            </div>
          </div>
        </form>
      </Show>
    </AppPage>
  );
}
