import { createAsync } from "@solidjs/router";

import { listLeadsForQuotation } from "~/actions/pipeline/quotations";
import Building2 from "~/components/icons/building-2";
import List from "~/components/icons/list";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type { RecordIndexAdapter } from "~/features/record-index/model/types";

import type { QuotationRow } from "./columns";
import { QUOTATIONS_RECORD_INDEX_COLUMNS } from "./columns";
import { useOpenQuotationRecord } from "./open-row";

import styles from "./styles.module.css";

export function QuotationsRecordIndex() {
  const leads = createAsync(() => listLeadsForQuotation({}));
  const rows = () => leads() ?? [];
  const isLoading = () => leads() === undefined;
  const { rowOpen } = useOpenQuotationRecord();

  const adapter = {
    id: "quotations",
    title: "Cotizaciones",
    ariaLabel: "Cotizaciones",
    pickerIcon: List,
    columns: QUOTATIONS_RECORD_INDEX_COLUMNS,
    getRows: rows,
    isLoading,
    rowOpen,
    emptyState: {
      icon: Building2,
      title: "Add your first quotation lead",
      description: "Add your first quotation lead manually.",
    },
    class: styles.page,
  } satisfies RecordIndexAdapter<QuotationRow>;

  return <RecordIndexScreen adapter={adapter} />;
}
