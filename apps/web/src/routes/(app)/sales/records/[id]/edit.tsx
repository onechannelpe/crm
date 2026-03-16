import { createAsync, useNavigate, useParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";

import {
  submitSalesRecord,
  updateSalesRecordDraft,
} from "~/actions/sales-records";
import { AddressFields } from "~/components/features/sales/address-fields";
import { ClientFields } from "~/components/features/sales/client-fields";
import { ProductLineEditor } from "~/components/features/sales/product-line-editor";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Textarea } from "~/components/ui/input/textarea";
import { useAsyncAction } from "~/hooks/use-async-action";
import { getErrorMessage } from "~/lib/errors";
import {
  salesRecordFixContextQuery,
  salesRecordProductsQuery,
} from "~/lib/queries/sales-records";
import { useSalesRecordForm } from "~/lib/sales/use-sales-record-form";

import styles from "../../edit-sale-page.module.css";

export default function FixSalePage() {
  const params = useParams();
  const navigate = useNavigate();
  const noteId = () => Number(params.id);
  const [fixNotes, setFixNotes] = createSignal("");

  const form = useSalesRecordForm();
  const { showToast } = useToast();

  const fixContext = createAsync(() => salesRecordFixContextQuery(noteId()));
  const currentProducts = createAsync(() => salesRecordProductsQuery(), {
    initialValue: [],
  });

  createEffect(() => {
    const context = fixContext();
    if (!context) return;

    form.setRuc(context.client?.ruc ?? "");
    form.setCompanyName(context.client?.companyName ?? "");
    form.setContactName(context.client?.contactName ?? "");
    form.setDni(context.client?.dni ?? "");
    form.setPhone(context.client?.phones[0] ?? "");

    form.setInstallationAddress(
      context.addresses.find((a) => a.addressType === "installation")
        ?.fullText ?? "",
    );
    form.setBillingAddress(
      context.addresses.find((a) => a.addressType === "billing")?.fullText ??
        "",
    );
    form.setReferenceAddress(
      context.addresses.find((a) => a.addressType === "reference")?.fullText ??
        "",
    );

    form.setProductLines(
      context.products.map((line) => ({
        productId: line.id,
        quantity: line.quantity,
      })),
    );
  });

  const canResubmit = createMemo(() => {
    const status = fixContext()?.status;
    return status === "rejected" || status === "draft";
  });
  const isDraft = createMemo(() => fixContext()?.status === "draft");

  const [handleResubmit, isSubmitting] = useAsyncAction(async (e: Event) => {
    e.preventDefault();
    if (!isDraft() && !fixNotes().trim()) {
      showToast("error", "Describe las correcciones realizadas");
      return;
    }
    const validationError = form.validateForSubmit();
    if (validationError) {
      showToast("error", validationError);
      return;
    }
    try {
      await updateSalesRecordDraft(
        noteId(),
        {
          client: form.buildClientPayload(),
          addresses: form.buildAddressPayload(),
          products: form.buildProductPayload(),
        },
        fixNotes().trim(),
      );
      await submitSalesRecord(noteId());
      showToast(
        "success",
        isDraft() ? "Registro de venta enviado" : "Registro de venta reenviado",
      );
      navigate("/sales/confirmations");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "No se pudo reenviar"));
    }
  });

  return (
    <AppPage width="medium">
      <Show when={fixContext()}>
        {(context) => (
          <form onSubmit={(e) => void handleResubmit(e)}>
            <div class={styles.panelPadded}>
              <div class={styles.formBlock}>
                <h2 class={styles.blockTitle}>
                  {isDraft() ? "Cliente" : "Corrección del cliente"}
                </h2>
                <ClientFields form={form} />
              </div>

              <div class={styles.formBlock}>
                <h2 class={styles.blockTitle}>
                  {isDraft() ? "Direcciones" : "Corrección de direcciones"}
                </h2>
                <AddressFields form={form} />
              </div>

              <div class={styles.formBlock}>
                <h2 class={styles.blockTitle}>
                  {isDraft() ? "Productos" : "Corrección de productos"}
                </h2>
                <ProductLineEditor
                  form={form}
                  products={currentProducts() ?? []}
                  onError={(msg) => showToast("error", msg)}
                />
              </div>

              <Show when={context().attempts.length > 0}>
                <div class={styles.rejectionBlock}>
                  <h2 class={styles.blockTitle}>Intentos del back office</h2>
                  <ul class={styles.rejectionList}>
                    <For each={context().attempts}>
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
                <h2 class={styles.blockTitle}>
                  {isDraft() ? "Notas del registro" : "Correcciones realizadas"}
                </h2>
                <Textarea
                  label={isDraft() ? "Notas" : "Notas de corrección"}
                  value={fixNotes()}
                  onInput={(e) => setFixNotes(e.currentTarget.value)}
                  rows={4}
                  required={!isDraft()}
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
                <Button
                  type="submit"
                  disabled={isSubmitting() || !canResubmit()}
                >
                  {isSubmitting()
                    ? "Enviando..."
                    : isDraft()
                      ? "Enviar para aprobación"
                      : "Reenviar para aprobación"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Show>
    </AppPage>
  );
}
