import { createAsync, useAction } from "@solidjs/router";
import { createSignal } from "solid-js";

import { AppPage, AppPageSection } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  requestMoreLeadRefillMutation,
  requestMoreSearchesMutation,
} from "~/lib/mutations/capacity";
import { myContactAssignmentCapacityQuery } from "~/lib/queries/contact-assignment-capacity";
import { mySearchAllowanceQuery } from "~/lib/queries/search";

import styles from "./capacity-page.module.css";

function CapacityStatus(props: {
  title: string;
  value: string;
  caption: string;
}) {
  return (
    <AppPageSection>
      <div class={styles.status}>
        <span class={styles.statusTitle}>{props.title}</span>
        <span class={styles.statusValue}>{props.value}</span>
        <span class={styles.statusCaption}>{props.caption}</span>
      </div>
    </AppPageSection>
  );
}

// Both capacity requests (searches, lead refills) are the same ask: a quantity
// plus a justification. They move together, so they share one form.
function CapacityRequestForm(props: {
  title: string;
  initialAmount: string;
  onRequest: (amount: number, reason: string) => void;
}) {
  const [amount, setAmount] = createSignal(props.initialAmount);
  const [reason, setReason] = createSignal("");

  return (
    <AppPageSection>
      <form
        class={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          props.onRequest(Number(amount()), reason());
        }}
      >
        <h3 class={styles.formTitle}>{props.title}</h3>
        <Input
          type="number"
          label="Cantidad"
          value={amount()}
          onInput={(event) => setAmount(event.currentTarget.value)}
          required
        />
        <Input
          label="Motivo"
          value={reason()}
          onInput={(event) => setReason(event.currentTarget.value)}
          required
        />
        <div class={styles.formActions}>
          <Button type="submit">Enviar solicitud</Button>
        </div>
      </form>
    </AppPageSection>
  );
}

export default function MyCapacityPage() {
  const searchStatus = createAsync(() => mySearchAllowanceQuery());
  const leadStatus = createAsync(() => myContactAssignmentCapacityQuery());
  const requestSearches = useAction(requestMoreSearchesMutation);
  const requestRefill = useAction(requestMoreLeadRefillMutation);

  const searchLimit = () =>
    (searchStatus()?.policy.monthlyLimit ?? 0) + (searchStatus()?.granted ?? 0);

  return (
    <AppPage width="medium">
      <div class={styles.statusGrid}>
        <CapacityStatus
          title="Búsquedas del mes"
          value={`${searchStatus()?.committed ?? 0}/${searchLimit()}`}
          caption={`${searchStatus()?.remaining ?? 0} restantes`}
        />
        <CapacityStatus
          title="Capacidad de leads"
          value={`${leadStatus()?.activeAssignments ?? 0}/${leadStatus()?.policy.bufferTarget ?? 0} activos`}
          caption={`${leadStatus()?.remaining ?? 0} refills hoy`}
        />
      </div>

      <CapacityRequestForm
        title="Solicitar más búsquedas"
        initialAmount="25"
        onRequest={(amount, reason) => void requestSearches(amount, reason)}
      />

      <CapacityRequestForm
        title="Solicitar más refills"
        initialAmount="10"
        onRequest={(amount, reason) => void requestRefill(amount, reason)}
      />
    </AppPage>
  );
}
