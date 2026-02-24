import { useNavigate, useSearchParams } from "@solidjs/router";
import { createResource, createSignal, For, onMount, Show } from "solid-js";

import {
  createSalesRecordDraft,
  getSalesRecordBootstrap,
  listSalesRecordProducts,
  submitSalesRecord,
} from "~/actions/sales-records";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import { getErrorMessage } from "~/lib/errors";

import styles from "./new-sale-page.module.css";

interface ProductLine {
  productId: number;
  quantity: number;
}

export default function NewSalePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [loading, setLoading] = createSignal(false);
  const [source, setSource] = createSignal<"lead_assignment" | "manual">(
    "manual",
  );
  const [leadAssignmentId, setLeadAssignmentId] = createSignal<number | null>(
    null,
  );

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

  const [products] = createResource(
    () => true,
    async () => listSalesRecordProducts(),
    { initialValue: [], ssrLoadFrom: "initial" },
  );
  const currentProducts = () => products.latest ?? [];

  onMount(() => {
    const contactIdRaw = searchParams.contactId;
    const contactId = contactIdRaw ? Number(contactIdRaw) : null;
    if (!contactId || Number.isNaN(contactId)) return;

    void (async () => {
      try {
        const bootstrap = await getSalesRecordBootstrap(contactId);
        setSource(bootstrap.source);
        setLeadAssignmentId(bootstrap.leadAssignmentId);
        setRuc(bootstrap.client.ruc ?? "");
        setCompanyName(bootstrap.client.companyName ?? "");
        setContactName(bootstrap.client.contactName ?? "");
        setDni(bootstrap.client.dni ?? "");
        setPhone(bootstrap.client.phones[0] ?? "");
      } catch (err: unknown) {
        showToast("error", getErrorMessage(err, "Failed to load lead data"));
      }
    })();
  });

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

  async function handleSubmit(e: Event) {
    e.preventDefault();
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
      const created = await createSalesRecordDraft({
        source: source(),
        leadAssignmentId: leadAssignmentId(),
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
      });

      await submitSalesRecord(created.id);
      showToast("success", `Sales record #${created.id} submitted`);
      navigate("/sales/leads");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to submit sales record"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppPage width="medium">
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <div class={styles.formGrid}>
          <Input
            label="RUC"
            value={ruc()}
            placeholder="20100200300"
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
            type="tel"
            value={phone()}
            onInput={(e) => setPhone(e.currentTarget.value)}
            placeholder="+51..."
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

        <div class={styles.columns}>
          <section class={styles.column}>
            <h2 class={styles.columnTitle}>Products</h2>
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
          </section>

          <section class={styles.column}>
            <h2 class={styles.columnTitle}>Current lines</h2>
            <Show
              when={productLines().length > 0}
              fallback={<p class={styles.draftHint}>No products selected.</p>}
            >
              <ul class={styles.documentList}>
                <For each={productLines()}>
                  {(line) => {
                    const product = () =>
                      currentProducts().find((it) => it.id === line.productId);
                    return (
                      <li class={styles.documentItem}>
                        <span>
                          {product()?.name ?? `Product #${line.productId}`} x{" "}
                          {line.quantity}
                        </span>
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
          </section>
        </div>

        <div class={styles.formActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/sales/leads")}
            disabled={loading()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading()}>
            {loading() ? "Submitting..." : "Submit for confirmation"}
          </Button>
        </div>
      </form>
    </AppPage>
  );
}
