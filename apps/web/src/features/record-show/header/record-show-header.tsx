import { Title } from "@solidjs/meta";
import { A, createAsync } from "@solidjs/router";
import { Show, createMemo, type ParentProps } from "solid-js";

import Building2 from "~/components/icons/building-2";
import { PageCardHeader } from "~/components/ui/layout/page-card/page-card-header";
import { leadDetailQuery } from "~/features/workflow/data/lead-detail.query";
import { leadListQuery } from "~/features/workflow/data/lead-list.query";

import styles from "./record-show-header.module.css";

type RecordShowHeaderProps = ParentProps<{ leadId: string }>;

const LEAD_NAVIGATION_LIMIT = 200;

export function RecordShowHeader(props: RecordShowHeaderProps) {
  const data = createAsync(() => leadDetailQuery(props.leadId));
  const leadList = createAsync(() =>
    leadListQuery({ limit: LEAD_NAVIGATION_LIMIT, offset: 0 }),
  );

  const displayName = createMemo(
    () => data()?.lead.legalName ?? data()?.lead.ruc ?? "—",
  );

  const documentTitle = () => {
    const name = data()?.lead.legalName ?? data()?.lead.ruc;
    return name ? `${name} - Registro` : "Registro";
  };

  const currentIndex = createMemo(() => {
    const rows = leadList()?.rows;
    if (!rows) {
      return -1;
    }

    return rows.findIndex((row) => row.id === props.leadId);
  });

  const paginationLabel = createMemo(() => {
    const totalCount = leadList()?.totalCount;
    const index = currentIndex();
    if (!totalCount || index < 0) {
      return null;
    }

    return `(${index + 1}/${totalCount})`;
  });

  return (
    <>
      <Title>{documentTitle()}</Title>
      <PageCardHeader
        breadcrumb={
          <span class={styles.breadcrumb}>
            <A href="/records" class={styles.breadcrumbLink}>
              <span class={styles.breadcrumbPrefix}>
                <span class={styles.objectIconBadge}>
                  <Building2 size={14} />
                </span>
                <span>Registros</span>
              </span>
            </A>
            <span class={styles.breadcrumbSep}>/</span>
            <span class={styles.breadcrumbCurrent} title={displayName()}>
              {displayName()}
            </span>
            <Show when={paginationLabel()}>
              {(label) => <span class={styles.paginationInfo}>{label()}</span>}
            </Show>
          </span>
        }
        actionButton={props.children}
      />
    </>
  );
}
