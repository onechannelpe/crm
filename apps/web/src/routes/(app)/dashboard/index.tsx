import { useNavigate } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";

import { getDashboardStats } from "~/actions/dashboard";
import { getQuotaStatus } from "~/actions/quota";
import ChevronDown from "~/components/icons/chevron-down";
import { AppPage, AppPageHeader } from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import { Button } from "~/components/ui/input/button";
import { hasPermission } from "~/lib/auth/access/rbac";
import { createAppQuery } from "~/lib/ui/create-app-query";

import styles from "./dashboard-page.module.css";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const [quota] = createAppQuery(getQuotaStatus, { allocated: false });
  const [stats] = createAppQuery(getDashboardStats, {
    activeLeads: 0,
    pendingSales: 0,
    draftSales: 0,
    approvedSales: 0,
  });

  const [viewMode, setViewMode] = createSignal<"detailed" | "compact">(
    "detailed",
  );
  const [showViewMenu, setShowViewMenu] = createSignal(false);

  const totalQuota = () => {
    const current = quota();
    return current.allocated ? current.total : 0;
  };
  const boardColumns = () => [
    (() => {
      const currentQuota = quota();
      return {
        key: "quota",
        label: "Quota",
        tone: styles.tagQuota,
        amount: totalQuota(),
        action: { label: "View quota", href: "/quota" },
        cards: [
          {
            title: "Daily capacity",
            value: currentQuota.allocated
              ? `${currentQuota.used}/${currentQuota.total}`
              : "0",
            detail: currentQuota.allocated ? "Used / total" : "Not assigned",
            href: "/quota",
          },
        ],
      };
    })(),
    {
      key: "new",
      label: "New",
      tone: styles.tagNew,
      amount: stats().activeLeads,
      action: { label: "View leads", href: "/leads" },
      cards: [
        {
          title: "Lead queue",
          value: `${stats().activeLeads}`,
          detail: "Active leads",
          href: "/leads",
        },
      ],
    },
    {
      key: "screening",
      label: "Screening",
      tone: styles.tagScreening,
      amount: stats().draftSales,
      action: { label: "Continue draft", href: "/sales/new" },
      cards: [
        {
          title: "Sales draft",
          value: `${stats().draftSales}`,
          detail: "Draft notes",
          href: "/sales/new",
        },
      ],
    },
    {
      key: "review",
      label: "Review",
      tone: styles.tagReview,
      amount: stats().pendingSales,
      action: { label: "View pending", href: "/validation" },
      cards: [
        {
          title: "Pending approvals",
          value: `${stats().pendingSales}`,
          detail: "Awaiting validation",
          href: "/validation",
        },
      ],
    },
    {
      key: "won",
      label: "Customer",
      tone: styles.tagCustomer,
      amount: stats().approvedSales,
      action: { label: "View approved", href: "/sales/approved" },
      cards: [
        {
          title: "Approved sales",
          value: `${stats().approvedSales}`,
          detail: "Closed operations",
          href: "/sales/approved",
        },
      ],
    },
  ];

  return (
    <AppPage class={styles.page}>
      <AppPageHeader />

      <section class={styles.toolbar}>
        <div class={styles.toolbarMeta}>
          <span class={styles.toolbarPill}>By Stage</span>
        </div>
        <div class={styles.toolbarActions}>
          <div class={styles.viewMenu}>
            <button
              class={styles.toolbarAction}
              type="button"
              onClick={() => setShowViewMenu(!showViewMenu())}
            >
              View: {viewMode() === "detailed" ? "Detailed" : "Compact"}
              <ChevronDown size={14} />
            </button>
            <Show when={showViewMenu()}>
              <div class={styles.viewDropdown}>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("detailed");
                    setShowViewMenu(false);
                  }}
                >
                  Detailed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("compact");
                    setShowViewMenu(false);
                  }}
                >
                  Compact
                </button>
              </div>
            </Show>
          </div>
        </div>
      </section>

      <section class={styles.boardWrap}>
        <div class={styles.board}>
          <For each={boardColumns()}>
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
                    <article class={styles.card}>
                      <p class={styles.cardTitle}>{card.title}</p>
                      <Show when={viewMode() === "detailed"}>
                        <p class={styles.cardValue}>{card.value}</p>
                        <p class={styles.cardDetail}>{card.detail}</p>
                      </Show>
                      <div class={styles.cardAction}>
                        <Button
                          size="sm"
                          variant={
                            hasPermission(currentUser().role, "sales:review")
                              ? "outline"
                              : "secondary"
                          }
                          class={styles.openButton}
                          onClick={() => navigate(card.href)}
                        >
                          Open
                        </Button>
                      </div>
                    </article>
                  )}
                </For>

                <button
                  class={styles.columnAction}
                  type="button"
                  onClick={() => navigate(column.action.href)}
                >
                  {column.action.label}
                </button>
              </div>
            )}
          </For>
        </div>
      </section>
    </AppPage>
  );
}
