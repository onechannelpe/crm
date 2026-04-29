import { useAction, useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";

import { Button } from "~/components/ui/input/button";
import {
  Widget,
  WidgetBody,
  WidgetHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import { toAppError } from "~/lib/app-errors";

import { createSaleContainerMutation } from "../../data/mutations";

import styles from "./sale.module.css";

type SaleSectionProps = {
  leadId: string;
};

export function SaleSection(props: SaleSectionProps) {
  const navigate = useNavigate();
  const create = useAction(createSaleContainerMutation);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleCreateSale() {
    setError(null);
    setSubmitting(true);
    try {
      await create({ leadId: props.leadId });
      navigate("/records");
    } catch (err) {
      setError(toAppError(err, "Error al crear venta").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Venta" />
      </WidgetHeader>
      <WidgetBody>
        <div class={styles.actions}>
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={submitting()}
            onClick={() => void handleCreateSale()}
          >
            Crear venta
          </Button>
        </div>
        {error() && <p class={styles.error}>{error()}</p>}
      </WidgetBody>
    </Widget>
  );
}
