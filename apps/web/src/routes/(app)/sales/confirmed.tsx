import { createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state";
import { AppPage } from "~/components/layout/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { confirmedSalesRecordsQuery } from "~/lib/queries/sales-records";
import { formatDate } from "~/lib/utils";

import styles from "./confirmed-sales-page.module.css";

export default function ConfirmedSalesPage() {
  const sales = createAsync(() => confirmedSalesRecordsQuery(), {
    initialValue: [],
  });

  return (
    <AppPage>
      <Show
        when={sales().length > 0}
        fallback={
          <EmptyState
            title="No confirmed sales"
            description="Confirmed sales will appear here."
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Executive</TableHead>
              <TableHead>Confirmed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={sales()}>
              {(sale) => (
                <TableRow>
                  <TableCell class={styles.idCell}>#{sale.id}</TableCell>
                  <TableCell>
                    {sale.companyName || <span class={styles.muted}>—</span>}
                  </TableCell>
                  <TableCell>
                    <div class={styles.contactWrap}>
                      <p class={styles.contactName}>{sale.contactName}</p>
                      <p class={styles.contactMeta}>{sale.contactDni}</p>
                    </div>
                  </TableCell>
                  <TableCell>{sale.executiveName}</TableCell>
                  <TableCell class={styles.dateCell}>
                    {formatDate(sale.updatedAt)}
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </Show>
    </AppPage>
  );
}
