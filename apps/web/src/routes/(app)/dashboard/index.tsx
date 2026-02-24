import { A } from "@solidjs/router";
import { createMemo, For } from "solid-js";

import { getDashboardStats } from "~/actions/dashboard";
import { getQuotaStatus } from "~/actions/quota";
import { AppPage } from "~/components/layout/page";
import { createAppQuery } from "~/lib/ui/create-app-query";

import styles from "./dashboard-page.module.css";

type DashboardColumn = {
  key: string;
  label: string;
  tone: string;
  amount: number;
  cards: Array<{ title: string; value: string; detail: string; href: string }>;
  actionLabel: string;
  actionHref: string;
};

export default function DashboardPage() {
  const [quota] = createAppQuery(getQuotaStatus, { allocated: false });
  const [stats] = createAppQuery(getDashboardStats, {
    activeLeads: 0,
    pendingSales: 0,
    draftSales: 0,
    confirmedSales: 0,
  });

  const columns = createMemo<DashboardColumn[]>(() => {
    const q = quota();
    const s = stats();
    return [
      {
        key: "quota",
        label: "Quota",
        tone: styles.tagQuota,
        amount: q.allocated ? q.total : 0,
        cards: [
          {
            title: "Daily capacity",
            value: q.allocated ? `${q.used}/${q.total}` : "0",
            detail: q.allocated ? "Used / total" : "Not assigned",
            href: "/quota",
          },
        ],
        actionLabel: "View quota",
        actionHref: "/quota",
      },
      {
        key: "new",
        label: "New",
        tone: styles.tagNew,
        amount: s.activeLeads,
        cards: [
          {
            title: "Lead queue",
            value: `${s.activeLeads}`,
            detail: "Active leads",
            href: "/sales/leads",
          },
        ],
        actionLabel: "View leads",
        actionHref: "/sales/leads",
      },
      {
        key: "screening",
        label: "Screening",
        tone: styles.tagScreening,
        amount: s.draftSales,
        cards: [
          {
            title: "Sales draft",
            value: `${s.draftSales}`,
            detail: "Draft notes",
            href: "/sales/records/new",
          },
        ],
        actionLabel: "Continue draft",
        actionHref: "/sales/records/new",
      },
      {
        key: "review",
        label: "Review",
        tone: styles.tagReview,
        amount: s.pendingSales,
        cards: [
          {
            title: "Pending confirmations",
            value: `${s.pendingSales}`,
            detail: "Awaiting validation",
            href: "/sales/review/queue",
          },
        ],
        actionLabel: "View pending",
        actionHref: "/sales/review/queue",
      },
      {
        key: "customer",
        label: "Customer",
        tone: styles.tagCustomer,
        amount: s.confirmedSales,
        cards: [
          {
            title: "Confirmed sales",
            value: `${s.confirmedSales}`,
            detail: "Closed operations",
            href: "/sales/review/confirmed",
          },
        ],
        actionLabel: "View confirmed",
        actionHref: "/sales/review/confirmed",
      },
    ];
  });

  return (
    <AppPage>
      <div class={styles.boardGrid}>
        <div class={styles.boardWrap}>
          <div class={styles.board}>
            <For each={columns()}>
              {(column) => (
                <div class={styles.column}>
                  <div class={styles.columnHead}>
                    <span class={`${styles.tag} ${column.tone}`}>
                      {column.label}
                    </span>
                    <span class={styles.columnAmount}>{column.amount}</span>
                  </div>
                  <For each={column.cards}>
                    {(card) => (
                      <A href={card.href} class={styles.card}>
                        <p class={styles.cardTitle}>{card.title}</p>
                        <p class={styles.cardValue}>{card.value}</p>
                        <p class={styles.cardDetail}>{card.detail}</p>
                      </A>
                    )}
                  </For>
                  <A href={column.actionHref} class={styles.columnAction}>
                    {column.actionLabel}
                  </A>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </AppPage>
  );
}
