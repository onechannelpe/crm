import { createAsync, useNavigate, useSearchParams } from "@solidjs/router";
import { createSignal, onMount } from "solid-js";

import {
  createSalesRecordDraft,
  getSalesRecordBootstrap,
  submitSalesRecord,
} from "~/actions/sales-records";
import { AddressFields } from "~/components/features/sales/address-fields";
import { ClientFields } from "~/components/features/sales/client-fields";
import { ProductLineEditor } from "~/components/features/sales/product-line-editor";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { useAsyncAction } from "~/hooks/use-async-action";
import { getErrorMessage } from "~/lib/errors";
import { salesRecordProductsQuery } from "~/lib/queries/sales-records";
import { useSalesRecordForm } from "~/lib/sales/use-sales-record-form";

import styles from "./new-sale-page.module.css";

export default function NewSalePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [source, setSource] = createSignal<"lead_assignment" | "manual">(
    "manual",
  );
  const [leadAssignmentId, setLeadAssignmentId] = createSignal<number | null>(
    null,
  );

  const form = useSalesRecordForm();
  const currentProducts = createAsync(() => salesRecordProductsQuery(), {
    initialValue: [],
  });

  onMount(() => {
    const contactIdRaw = searchParams.contactId;
    const contactId = contactIdRaw ? Number(contactIdRaw) : null;
    if (!contactId || Number.isNaN(contactId)) return;

    void (async () => {
      try {
        const bootstrap = await getSalesRecordBootstrap(contactId);
        setSource(bootstrap.source);
        setLeadAssignmentId(bootstrap.leadAssignmentId);
        form.setRuc(bootstrap.client.ruc ?? "");
        form.setCompanyName(bootstrap.client.companyName ?? "");
        form.setContactName(bootstrap.client.contactName ?? "");
        form.setDni(bootstrap.client.dni ?? "");
        form.setPhone(bootstrap.client.phones[0] ?? "");
      } catch (err: unknown) {
        showToast("error", getErrorMessage(err, "No se pudo cargar el lead"));
      }
    })();
  });

  const [handleSubmit, isSubmitting] = useAsyncAction(async (e: Event) => {
    e.preventDefault();
    const validationError = form.validateForSubmit();
    if (validationError) {
      showToast("error", validationError);
      return;
    }
    try {
      const created = await createSalesRecordDraft({
        source: source(),
        leadAssignmentId: leadAssignmentId(),
        client: form.buildClientPayload(),
        addresses: form.buildAddressPayload(),
        products: form.buildProductPayload(),
      });
      await submitSalesRecord(created.id);
      showToast("success", `Registro de venta #${created.id} enviado`);
      navigate("/sales/leads");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "No se pudo enviar el registro"));
    }
  });

  return (
    <AppPage width="medium">
      <form onSubmit={(e) => void handleSubmit(e)}>
        <div class={styles.formGrid}>
          <ClientFields form={form} />
          <AddressFields form={form} />
        </div>

        <div class={styles.columns}>
          <section class={styles.column}>
            <h2 class={styles.columnTitle}>Productos</h2>
            <ProductLineEditor
              form={form}
              products={currentProducts() ?? []}
              onError={(msg) => showToast("error", msg)}
            />
          </section>
        </div>

        <div class={styles.formActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/sales/leads")}
            disabled={isSubmitting()}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={isSubmitting()}
            disabled={isSubmitting()}
          >
            Enviar para confirmación
          </Button>
        </div>
      </form>
    </AppPage>
  );
}
