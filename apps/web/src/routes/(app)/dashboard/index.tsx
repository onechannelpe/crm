import { A, createAsync } from "@solidjs/router";
import { createMemo, For } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { dashboardStatsQuery } from "~/lib/queries/dashboard";
import { quotaStatusQuery } from "~/lib/queries/quota";

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
  const quota = createAsync(() => quotaStatusQuery(), {
    initialValue: { allocated: false },
  });
  const stats = createAsync(() => dashboardStatsQuery(), {
    initialValue: {
      activeLeads: 0,
      pendingSales: 0,
      draftSales: 0,
      confirmedSales: 0,
    },
  });

  const columns = createMemo<DashboardColumn[]>(() => {
    const q = quota();
    const s = stats();
    return [
      {
        key: "quota",
        label: "Cuota",
        tone: styles.tagQuota,
        amount: q.allocated ? q.total : 0,
        cards: [
          {
            title: "Capacidad diaria",
            value: q.allocated ? `${q.used}/${q.total}` : "0",
            detail: q.allocated ? "Usado / total" : "Sin asignar",
            href: "/quota",
          },
        ],
        actionLabel: "Ver cuota",
        actionHref: "/quota",
      },
      {
        key: "new",
        label: "Nuevo",
        tone: styles.tagNew,
        amount: s.activeLeads,
        cards: [
          {
            title: "Cola de clientes",
            value: `${s.activeLeads}`,
            detail: "Clientes activos",
            href: "/sales/leads",
          },
        ],
        actionLabel: "Ver clientes",
        actionHref: "/sales/leads",
      },
      {
        key: "screening",
        label: "Evaluación",
        tone: styles.tagScreening,
        amount: s.draftSales,
        cards: [
          {
            title: "Venta en borrador",
            value: `${s.draftSales}`,
            detail: "Notas en borrador",
            href: "/sales/records/new",
          },
        ],
        actionLabel: "Continuar borrador",
        actionHref: "/sales/records/new",
      },
      {
        key: "review",
        label: "Revisión",
        tone: styles.tagReview,
        amount: s.pendingSales,
        cards: [
          {
            title: "Confirmaciones pendientes",
            value: `${s.pendingSales}`,
            detail: "Esperando validación",
            href: "/sales/confirmations",
          },
        ],
        actionLabel: "Ver pendientes",
        actionHref: "/sales/confirmations",
      },
      {
        key: "customer",
        label: "Cliente",
        tone: styles.tagCustomer,
        amount: s.confirmedSales,
        cards: [
          {
            title: "Ventas confirmadas",
            value: `${s.confirmedSales}`,
            detail: "Operaciones cerradas",
            href: "/sales/confirmed",
          },
        ],
        actionLabel: "Ver confirmadas",
        actionHref: "/sales/confirmed",
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
