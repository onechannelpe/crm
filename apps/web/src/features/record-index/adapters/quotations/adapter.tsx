import { createAsync } from "@solidjs/router";

import { queryRecordList } from "~/actions/pipeline/queries/records";
import Building2 from "~/components/icons/building-2";
import List from "~/components/icons/list";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type {
  RecordIndexAdapter,
  RecordIndexSource,
} from "~/features/record-index/model/types";

import type { QuotationRow } from "./columns";
import { QUOTATIONS_RECORD_INDEX_COLUMNS } from "./columns";
import { useOpenQuotationRecord } from "./open-row";

import styles from "./styles.module.css";

export function QuotationsRecordIndex() {
  const leads = createAsync(() =>
    queryRecordList({ stage: "READY_FOR_QUOTATION" }),
  );
  const { rowOpen } = useOpenQuotationRecord();
  const source = (): RecordIndexSource<QuotationRow> => {
    const data = leads();

    if (data === undefined) {
      return { status: "pending", rows: [] };
    }

    return { status: "ready", rows: data.rows };
  };

  const adapter = {
    id: "quotations",
    title: "Cotizaciones",
    ariaLabel: "Cotizaciones",
    pickerIcon: List,
    columns: QUOTATIONS_RECORD_INDEX_COLUMNS,
    source,
    selectable: true,
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
