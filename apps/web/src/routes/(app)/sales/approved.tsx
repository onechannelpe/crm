import { createResource, For, Show } from "solid-js";

import { getApprovedSales } from "~/actions/sales";
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
import { formatDate } from "~/lib/utils";

import styles from "./approved-sales-page.module.css";

export default function ApprovedSalesPage() {
  const [sales] = createResource(
    () => true,
    async () => getApprovedSales(),
    { initialValue: [], ssrLoadFrom: "initial" },
  );

  return (
    <AppPage>
      <Show
        when={sales().length > 0}
        fallback={
          <EmptyState
            title="No approved sales"
            description="Approved sales will appear here."
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
              <TableHead>Approved</TableHead>
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
                    {formatDate(sale.updated_at)}
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
