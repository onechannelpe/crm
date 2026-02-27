import { createAsync, useNavigate, useParams } from "@solidjs/router";
import { createEffect, createSignal, For, Show } from "solid-js";

import {
  submitSalesRecord,
  updateSalesRecordDraft,
} from "~/actions/sales-records";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";
import { getErrorMessage } from "~/lib/errors";
import {
  salesRecordFixContextQuery,
  salesRecordProductsQuery,
} from "~/lib/queries/sales-records";

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

  const fixContext = createAsync(() => salesRecordFixContextQuery(noteId()));
  const currentProducts = createAsync(() => salesRecordProductsQuery(), {
    initialValue: [],
  });
  const { showToast } = useToast();

  createEffect(() => {
    const context = fixContext();
    if (!context) return;

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
  });

  const canResubmit = () => {
    const status = fixContext()?.status;
    return status === "rejected" || status === "draft";
  };

  function handleAddProductLine() {
    const productId = Number(selectedProductId());
    const quantity = Number(selectedProductQty());
    if (!productId || Number.isNaN(productId)) {
      showToast("error", "Selecciona un producto");
      return;
    }
    if (!quantity || Number.isNaN(quantity) || quantity < 1) {
      showToast("error", "La cantidad debe ser al menos 1");
      return;
    }
    if (productLines().some((line) => line.productId === productId)) {
      showToast("error", "Este producto ya está en la lista");
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
      showToast("error", "Describe las correcciones realizadas");
      return;
    }
    if (!companyName().trim() || !contactName().trim() || !dni().trim()) {
      showToast("error", "Empresa, contacto y DNI son obligatorios");
      return;
    }
    if (!installationAddress().trim()) {
      showToast("error", "La dirección de instalación es obligatoria");
      return;
    }
    if (productLines().length < 1) {
      showToast("error", "Se require al menos un producto");
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
      showToast("success", "Registro de venta reenviado");
      navigate("/sales/confirmations");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "No se pudo reenviar"));
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
              <h2 class={styles.blockTitle}>Corrección del cliente</h2>
              <Input
                label="RUC"
                value={ruc()}
                onInput={(e) => setRuc(e.currentTarget.value)}
              />
              <Input
                label="Empresa"
                value={companyName()}
                onInput={(e) => setCompanyName(e.currentTarget.value)}
                required
              />
              <Input
                label="Contacto"
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
                label="Teléfono"
                value={phone()}
                onInput={(e) => setPhone(e.currentTarget.value)}
              />
              <Input
                label="Dirección de instalación"
                value={installationAddress()}
                onInput={(e) => setInstallationAddress(e.currentTarget.value)}
                required
              />
              <Input
                label="Dirección de facturación (opcional)"
                value={billingAddress()}
                onInput={(e) => setBillingAddress(e.currentTarget.value)}
              />
              <Input
                label="Dirección de referencia (optional)"
                value={referenceAddress()}
                onInput={(e) => setReferenceAddress(e.currentTarget.value)}
              />
            </div>

            <div class={styles.formBlock}>
              <h2 class={styles.blockTitle}>Corrección de productos</h2>
              <Select
                value={selectedProductId()}
                onInput={(e) => setSelectedProductId(e.currentTarget.value)}
              >
                <option value="">Selecciona un producto</option>
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
                label="Cantidad"
                value={selectedProductQty()}
                min="1"
                onInput={(e) => setSelectedProductQty(e.currentTarget.value)}
              />
              <Button
                type="button"
                onClick={handleAddProductLine}
                disabled={!selectedProductId()}
              >
                Agregar producto
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
                            Cantidad: {line.quantity}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleRemoveProductLine(line.productId)
                            }
                          >
                            Quitar
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
                <h2 class={styles.blockTitle}>Intentos del back office</h2>
                <ul class={styles.rejectionList}>
                  <For each={fixContext()?.attempts ?? []}>
                    {(attempt) => (
                      <li class={styles.rejectionItem}>
                        <p class={styles.rejectionField}>
                          {attempt.outcome} - {attempt.reviewerName}
                        </p>
                        <p class={styles.rejectionNote}>
                          {attempt.notes ?? "Sin notas"}
                        </p>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>

            <div class={styles.formBlock}>
              <h2 class={styles.blockTitle}>Correcciones realizadas</h2>
              <Textarea
                label="Notas de corrección"
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
                Volver a leads
              </Button>
              <Button type="submit" disabled={loading() || !canResubmit()}>
                {loading() ? "Enviando..." : "Reenviar para aprobación"}
              </Button>
            </div>
          </div>
        </form>
      </Show>
    </AppPage>
  );
}
