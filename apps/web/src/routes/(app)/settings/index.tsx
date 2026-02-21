import { A } from "@solidjs/router";
import {
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
  type JSX,
} from "solid-js";

import { getProductCatalog, updateProductPricing } from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import SettingsIcon from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import UserRound from "~/components/icons/user-round";
import Users from "~/components/icons/users";
import X from "~/components/icons/x";
import { AppPage } from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import { LoginRetriesCard } from "~/components/settings/login-retries-card";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import {
  canAccessPath,
  getDefaultAppPath,
} from "~/lib/auth/access/route-policy";
import { getErrorMessage } from "~/lib/errors";
import { runOptimistic } from "~/lib/ui/run-optimistic";
import { cn } from "~/lib/utils";

import styles from "./settings-page.module.css";

type SettingsTabId =
  | "profile"
  | "experience"
  | "general"
  | "members"
  | "security";

type SettingsNavItem = {
  id: SettingsTabId;
  label: string;
  section: "User" | "Workspace";
  icon: (props: { class?: string }) => JSX.Element;
};

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { id: "profile", label: "Profile", section: "User", icon: UserRound },
  {
    id: "experience",
    label: "Experience",
    section: "User",
    icon: SettingsIcon,
  },
  { id: "general", label: "General", section: "Workspace", icon: SettingsIcon },
  { id: "members", label: "Members", section: "Workspace", icon: Users },
  {
    id: "security",
    label: "Security",
    section: "Workspace",
    icon: ShieldCheck,
  },
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
    <AppPage>
      <Show
        when={canSeeSettings()}
        fallback={
          <section class={styles.noAccess}>
            You do not have permission to access settings.
          </section>
        }
      >
        <section class={styles.layout}>
          <aside class={styles.nav}>
            <div class={styles.navScroll}>
              <A
                href={getDefaultAppPath(currentUser().role)}
                class={cn(styles.item, styles.exit)}
              >
                <X class={styles.icon} />
                <span>Exit settings</span>
              </A>

              <For each={["User", "Workspace"] as const}>
                {(section) => (
                  <section class={styles.section}>
                    <h4 class={styles.groupTitle}>{section}</h4>
                    <For each={sectionItems(section)}>
                      {(item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            type="button"
                            class={cn(
                              styles.item,
                              activeTab() === item.id && styles.itemActive,
                            )}
                            onClick={() => setActiveTab(item.id)}
                          >
                            <Icon class={styles.icon} />
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

          <div class={styles.page}>
            <div class={styles.topbar}>
              <nav class={styles.crumbs}>
                <span>{activeSection().section}</span>
                <span>/</span>
                <span class={styles.crumbCurrent}>{activeSection().label}</span>
              </nav>
            </div>

            <div class={styles.contentScroll}>
              <Show
                when={activeTab() === "general"}
                fallback={
                  <div class={styles.content}>
                    <section class={styles.block}>
                      <h2 class={styles.title}>{activeSection().label}</h2>
                      <p class={styles.placeholderText}>
                        Configuration for this section is not available yet.
                      </p>
                    </section>
                  </div>
                }
              >
                <div class={styles.content}>
                  <section class={styles.block}>
                    <div>
                      <h2 class={styles.title}>Product catalog</h2>
                      <p class={styles.description}>
                        Update product price and activation state.
                      </p>
                    </div>
                    <div class={styles.products}>
                      <For each={currentProducts()}>
                        {(product) => {
                          const [price, setPrice] = createSignal(
                            String(product.price),
                          );
                          const [isActive, setIsActive] = createSignal(
                            product.is_active === 1,
                          );
                          return (
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                void save(product.id, price(), isActive());
                              }}
                            >
                              <div class={styles.productRow}>
                                <div>
                                  <p class={styles.productName}>
                                    {product.name}
                                  </p>
                                  <p class={styles.productCategory}>
                                    {product.category}
                                  </p>
                                </div>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  label="Price"
                                  value={price()}
                                  onInput={(event) =>
                                    setPrice(event.currentTarget.value)
                                  }
                                />
                                <Checkbox
                                  label="Active"
                                  checked={isActive()}
                                  onInput={(event) =>
                                    setIsActive(event.currentTarget.checked)
                                  }
                                />
                                <Button
                                  type="submit"
                                  disabled={savingId() === product.id}
                                >
                                  {savingId() === product.id
                                    ? "Saving..."
                                    : "Save"}
                                </Button>
                              </div>
                            </form>
                          );
                        }}
                      </For>
                    </div>
                  </section>
                  <section class={cn(styles.block, styles.securityBlock)}>
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
