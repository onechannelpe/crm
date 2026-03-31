import { createAsync } from "@solidjs/router";
import { createSignal } from "solid-js";

import { listLeads, registerLead } from "~/actions/pipeline/leads";
import List from "~/components/icons/list";
import Plus from "~/components/icons/plus";
import { RecordIndexScreen } from "~/features/record-index/components/screen";
import type { RecordIndexAdapter } from "~/features/record-index/model/types";
import { toAppError } from "~/lib/app-errors";

import type { LeadRow } from "./columns";
import { LEADS_RECORD_INDEX_COLUMNS } from "./columns";
import { LeadsRecordIndexDraftRow } from "./draft-row";
import { LeadsRecordIndexEmptyState } from "./empty-state";
import {
  LEADS_RECORD_INDEX_FILTER,
  type LeadStageFilterValue,
} from "./filters";
import { useOpenLeadRecord } from "./open-row";
import { LEADS_RECORD_INDEX_SORT, type LeadSortKey } from "./sorts";

import styles from "./styles.module.css";

export function LeadsRecordIndex() {
  const [reloadToken, setReloadToken] = createSignal(0);
  const leads = createAsync(() => {
    reloadToken();
    return listLeads({});
  });
  const rows = () => leads() ?? [];
  const isLoading = () => leads() === undefined;

  const [showDraftRow, setShowDraftRow] = createSignal(false);
  const [draftRuc, setDraftRuc] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  const { rowOpen } = useOpenLeadRecord();

  function openDraftRow() {
    setShowDraftRow(true);
    setError(null);
  }

  function closeDraftRow() {
    setShowDraftRow(false);
    setDraftRuc("");
    setError(null);
  }

  async function handleRegister() {
    const ruc = draftRuc().trim();
    setError(null);
    setSubmitting(true);

    try {
      const result = await registerLead({
        ruc,
        executiveId: 0,
      });

      rowOpen.open({
        id: result.id,
        ruc,
        razon_social: null,
      });
      closeDraftRow();
      setReloadToken((current) => current + 1);
    } catch (registerError) {
      setError(
        toAppError(registerError, "Error al registrar prospecto").publicMessage,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const adapter = {
    id: "leads",
    title: "All prospects",
    ariaLabel: "Prospectos",
    class: `${styles.page} record-index-container-gater-for-drag-select`,
    pickerIcon: List,
    columns: LEADS_RECORD_INDEX_COLUMNS,
    getRows: rows,
    isLoading,
    rowOpen,
    emptyState: <LeadsRecordIndexEmptyState onAddNew={openDraftRow} />,
    filter: LEADS_RECORD_INDEX_FILTER,
    sort: LEADS_RECORD_INDEX_SORT,
    renderDraftRow: showDraftRow()
      ? (context) => (
          <LeadsRecordIndexDraftRow
            columns={context.columns}
            draftRuc={draftRuc()}
            error={error()}
            gridTemplateColumns={context.gridTemplateColumns}
            onCancel={closeDraftRow}
            onDraftRucInput={setDraftRuc}
            onSubmit={() => void handleRegister()}
            stickyColumnIndex={context.stickyColumnIndex}
            stickyLeft={context.stickyLeft}
            submitting={submitting()}
          />
        )
      : undefined,
    actionRow: !showDraftRow()
      ? {
          icon: Plus,
          label: "Add New",
          onClick: openDraftRow,
        }
      : undefined,
  } satisfies RecordIndexAdapter<LeadRow, LeadStageFilterValue, LeadSortKey>;

  return <RecordIndexScreen adapter={adapter} />;
}
