import { A } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show, type JSX } from "solid-js";

import { getProductCatalog, updateProductPricing } from "~/actions/settings";
import SettingsIcon from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import UserRound from "~/components/icons/user-round";
import Users from "~/components/icons/users";
import X from "~/components/icons/x";
import { useToast } from "~/components/feedback/toast-provider";
import { LoginRetriesCard } from "~/components/settings/login-retries-card";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { canAccessPath } from "~/lib/auth/access/route-policy";
import { getErrorMessage } from "~/lib/errors";
import { runOptimistic } from "~/lib/ui/run-optimistic";
import { useSession } from "~/components/providers/session-provider";

type SettingsTabId = "profile" | "experience" | "general" | "members" | "security";

type SettingsNavItem = {
  id: SettingsTabId;
  label: string;
  section: "User" | "Workspace";
  icon: (props: { class?: string }) => JSX.Element;
};

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { id: "profile", label: "Profile", section: "User", icon: UserRound },
  { id: "experience", label: "Experience", section: "User", icon: SettingsIcon },
  { id: "general", label: "General", section: "Workspace", icon: SettingsIcon },
  { id: "members", label: "Members", section: "Workspace", icon: Users },
  { id: "security", label: "Security", section: "Workspace", icon: ShieldCheck },
];

export default function SettingsPage() {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const canSeeSettings = createMemo(() =>
    canAccessPath(currentUser().role, "/settings"),
  );
  const [activeTab, setActiveTab] = createSignal<SettingsTabId>("general");

  const [products, { mutate, refetch }] = createResource(
    () => canSeeSettings(),
    async () => getProductCatalog(),
    { initialValue: [], ssrLoadFrom: "initial" },
  );
  const currentProducts = () => products.latest ?? [];
  const [savingId, setSavingId] = createSignal<number | null>(null);

  const save = async (productId: number, price: string, isActive: boolean) => {
    setSavingId(productId);
    try {
      const numericPrice = Number(price);
      await runOptimistic({
        read: currentProducts,
        write: (next) => mutate(() => next),
        optimistic: (prev) =>
          prev.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  price: numericPrice,
                  is_active: isActive ? 1 : 0,
                }
              : product,
          ),
        commit: async () => {
          await updateProductPricing(productId, numericPrice, isActive);
        },
        reconcile: () => {
          void refetch();
        },
      });
      showToast("success", "Product updated");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to update product"));
    } finally {
      setSavingId(null);
    }
  };

  const activeSection = createMemo(() => {
    const current = SETTINGS_NAV_ITEMS.find((item) => item.id === activeTab());
    if (!current) return { section: "Workspace", label: "General" } as const;
    return { section: current.section, label: current.label } as const;
  });

  const sectionItems = (section: SettingsNavItem["section"]) =>
    SETTINGS_NAV_ITEMS.filter((item) => item.section === section);

  return (
    <AppPage class="space-y-0 pb-0">
      <Show
        when={canSeeSettings()}
        fallback={
          <section class="tw-record-index-panel p-4 text-[13px] text-muted-foreground">
            You do not have permission to access settings.
          </section>
        }
      >
      <section class="tw-settings-layout">
        <aside class="tw-settings-nav">
          <div class="tw-settings-nav-scroll">
            <A href="/dashboard" class="tw-sidebar-link mb-3">
              <X class="h-4 w-4" />
              <span>Exit settings</span>
            </A>

            <For each={["User", "Workspace"] as const}>
              {(section) => (
                <section class="tw-nav-section mb-3">
                  <h4 class="tw-sidebar-group-title">{section}</h4>
                  <For each={sectionItems(section)}>
                    {(item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          type="button"
                          class="tw-sidebar-link w-full"
                          data-active={activeTab() === item.id}
                          onClick={() => setActiveTab(item.id)}
                        >
                          <Icon class="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    }}
                  </For>
                </section>
              )}
            </For>
          </div>
        </aside>

        <div class="tw-settings-page">
          <div class="tw-settings-topbar">
            <nav class="inline-flex items-center gap-2 text-[13px]">
              <span>{activeSection().section}</span>
              <span>/</span>
              <span class="text-foreground">{activeSection().label}</span>
            </nav>
          </div>

          <div class="tw-settings-content-scroll">
            <Show
              when={activeTab() === "general"}
              fallback={
                <div class="tw-settings-content">
                  <section class="tw-settings-block">
                    <h2 class="text-[16px] font-semibold text-foreground">
                      {activeSection().label}
                    </h2>
                    <p class="text-[13px] text-muted-foreground">
                      Configuration for this section is not available yet.
                    </p>
                  </section>
                </div>
              }
            >
              <div class="tw-settings-content">
                <section class="tw-settings-block">
                  <div>
                    <h2 class="text-[16px] font-semibold text-foreground">Product catalog</h2>
                    <p class="mt-1 text-[13px] text-muted-foreground">
                      Update product price and activation state.
                    </p>
                  </div>
                  <div class="space-y-2">
                    <For each={currentProducts()}>
                      {(product) => {
                        const [price, setPrice] = createSignal(String(product.price));
                        const [isActive, setIsActive] = createSignal(
                          product.is_active === 1,
                        );
                        return (
                          <form
                            class="space-y-0"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void save(product.id, price(), isActive());
                            }}
                          >
                            <div class="grid grid-cols-1 items-end gap-3 border-b border-border py-2 md:grid-cols-[1fr_140px_140px_150px]">
                              <div>
                                <p class="font-medium text-foreground">{product.name}</p>
                                <p class="text-xs text-muted-foreground">{product.category}</p>
                              </div>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                label="Price"
                                value={price()}
                                onInput={(event) => setPrice(event.currentTarget.value)}
                              />
                              <Checkbox
                                label="Active"
                                checked={isActive()}
                                onInput={(event) =>
                                  setIsActive(event.currentTarget.checked)
                                }
                                class="mt-1"
                              />
                              <Button type="submit" disabled={savingId() === product.id}>
                                {savingId() === product.id ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </form>
                        );
                      }}
                    </For>
                  </div>
                </section>
                <section class="tw-settings-block border-t border-border pt-6">
                  <LoginRetriesCard />
                </section>
              </div>
            </Show>
          </div>
        </div>
      </section>
      </Show>
    </AppPage>
  );
}
