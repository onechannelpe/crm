import { useNavigate } from "@solidjs/router";
import { For } from "solid-js";

import { getDashboardStats } from "~/actions/dashboard";
import { getQuotaStatus } from "~/actions/quota";
import { AppPage, AppPageHeader } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { hasPermission } from "~/lib/auth/access/rbac";
import { createAppQuery } from "~/lib/ui/create-app-query";
import { useSession } from "~/components/providers/session-provider";

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
        tone: "bg-emerald-500/80",
        amount: totalQuota(),
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
      tone: "bg-red-500/80",
      amount: stats().activeLeads,
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
      tone: "bg-purple-500/80",
      amount: stats().draftSales,
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
      tone: "bg-sky-500/80",
      amount: stats().pendingSales,
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
      tone: "bg-amber-500/80",
      amount: stats().approvedSales,
      cards: [
        {
          title: "Approved sales",
          value: `${stats().approvedSales}`,
          detail: "Closed operations",
          href: "/validation",
        },
      ],
    },
  ];

  return (
    <AppPage class="space-y-2">
      <AppPageHeader
        eyebrow="Opportunities"
        title="By stage"
        description="Pipeline board"
      />

      <section class="flex items-center justify-between border-b border-border/50 px-1 pb-2 text-sm">
        <div class="flex items-center gap-2 text-muted-foreground">
          <span class="rounded-sm border border-border bg-surface px-2 py-0.5 text-xs font-medium">
            By Stage
          </span>
          <span>·</span>
          <span>6 views</span>
        </div>
        <div class="flex items-center gap-3 text-xs text-muted-foreground">
          <button class="hover:text-foreground">Filter</button>
          <button class="hover:text-foreground">Sort</button>
          <button class="hover:text-foreground">Options</button>
        </div>
      </section>

      <section class="overflow-x-auto pb-2">
        <div class="grid min-w-[1220px] grid-cols-5 gap-3">
        <For each={boardColumns()}>
          {(column) => (
            <div class="rounded-sm border border-border/55 bg-background/50 p-2">
              <div class="mb-2 flex items-center gap-2 px-1">
                <span
                  class={`inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-semibold text-white ${column.tone}`}
                >
                  {column.label}
                </span>
                <span class="text-xs text-muted-foreground">{column.amount}</span>
              </div>

              <For each={column.cards}>
                {(card) => (
                  <article class="mb-2 rounded-sm border border-border/60 bg-surface p-3">
                    <p class="truncate text-sm font-semibold text-foreground">
                      {card.title}
                    </p>
                    <p class="mt-2 text-lg font-semibold text-foreground">
                      {card.value}
                    </p>
                    <p class="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                    <div class="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>$ {card.value}</p>
                      <p>System</p>
                    </div>
                    <div class="mt-3">
                      <Button
                        size="sm"
                        variant={
                          hasPermission(currentUser().role, "sales:review")
                            ? "outline"
                            : "secondary"
                        }
                        class="h-7"
                        onClick={() => navigate(card.href)}
                      >
                        Open
                      </Button>
                    </div>
                  </article>
                )}
              </For>
              <button class="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                + New
              </button>
            </div>
          )}
        </For>
        </div>
      </section>
    </AppPage>
  );
}
