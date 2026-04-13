import { createAsync, useNavigate } from "@solidjs/router";

import type { SalesRecordQueueItemView } from "~/actions/sales-records/contracts";
import { EmptyState } from "~/components/feedback/empty-state/empty";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { DataGrid } from "~/features/data-grid/components/grid";
import { createRouteRowOpen } from "~/features/data-grid/model/row-open";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { confirmedSalesRecordsQuery } from "~/lib/queries/sales-records";
import { formatDate } from "~/lib/utils";

const CONFIRMED_SALES_COLUMNS = [
  {
    key: "id",
    label: "ID",
    icon: CircleQuestionMark,
    width: 90,
    sticky: true,
    renderCell: (sale) => `#${sale.id}`,
  },
  {
    key: "companyName",
    label: "Empresa",
    icon: Building2,
    minWidth: 220,
    grow: true,
    renderCell: (sale) => sale.companyName || "-",
  },
  {
    key: "contactName",
    label: "Contacto",
    icon: UserRound,
    minWidth: 220,
    grow: true,
    renderCell: (sale) => (
      <div class="space-y-1">
        <p class="font-medium">{sale.contactName}</p>
        <p class="text-xs text-muted-foreground">{sale.contactDni}</p>
      </div>
    ),
  },
  {
    key: "executiveName",
    label: "Ejecutivo",
    icon: UserRound,
    width: 180,
    renderCell: (sale) => sale.executiveName,
  },
  {
    key: "updatedAt",
    label: "Confirmado",
    icon: CalendarDays,
    width: 160,
    renderCell: (sale) => formatDate(sale.updatedAt),
  },
] satisfies ReadonlyArray<DataGridColumn<SalesRecordQueueItemView>>;

export default function ConfirmedSalesPage() {
  const navigate = useNavigate();
  const sales = createAsync(() => confirmedSalesRecordsQuery());
  const rows = () => sales() ?? [];
  const isLoading = () => sales() === undefined;
  const rowOpen = createRouteRowOpen<SalesRecordQueueItemView>((sale) => {
    navigate(`/sales/${sale.id}`);
  });

  return (
    <AppPage>
      <DataGrid
        ariaLabel="Ventas confirmadas"
        columns={[...CONFIRMED_SALES_COLUMNS]}
        emptyState={
          <EmptyState
            title="Sin ventas confirmadas"
            description="Las ventas confirmadas aparecerán aquí."
          />
        }
        rowOpen={rowOpen}
        source={{
          status: isLoading() ? "pending" : "ready",
          rows: rows(),
        }}
      />
    </AppPage>
  );
}
