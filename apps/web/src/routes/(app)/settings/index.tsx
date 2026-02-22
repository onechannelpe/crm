import { A } from "@solidjs/router";
import {
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
  type JSX,
} from "solid-js";

import {
  getProductCatalog,
  updateProductPricing,
  updateUserProfile,
  changePassword,
} from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import SettingsIcon from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import UserRound from "~/components/icons/user-round";
import X from "~/components/icons/x";
import { AppPage } from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import { LoginRetriesCard } from "~/components/settings/login-retries-card";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { getRoleLabel } from "~/lib/auth/access/role-display";
import {
  canAccessPath,
  getDefaultAppPath,
} from "~/lib/auth/access/route-policy";
import { getErrorMessage } from "~/lib/errors";
import { runOptimistic } from "~/lib/ui/run-optimistic";
import { cn } from "~/lib/utils";

import styles from "./settings-page.module.css";

type SettingsTabId = "profile" | "preferences" | "general" | "security";

type SettingsNavItem = {
  id: SettingsTabId;
  label: string;
  section: "User" | "Workspace";
  icon: (props: { class?: string }) => JSX.Element;
};

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { id: "profile", label: "Profile", section: "User", icon: UserRound },
  {
    id: "preferences",
    label: "Preferences",
    section: "User",
    icon: SettingsIcon,
  },
  { id: "general", label: "General", section: "Workspace", icon: SettingsIcon },
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

  const [profileName, setProfileName] = createSignal(
    currentUser().fullName || "",
  );
  const [profilePhone, setProfilePhone] = createSignal(
    currentUser().phoneE164 || "",
  );
  const [savingProfile, setSavingProfile] = createSignal(false);

  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [changingPassword, setChangingPassword] = createSignal(false);

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

  const saveProfile = async (e: Event) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile(profileName(), profilePhone());
      showToast("success", "Profile updated");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: Event) => {
    e.preventDefault();
    if (newPassword() !== confirmPassword()) {
      showToast("error", "Passwords do not match");
      return;
    }
    if (newPassword().length < 8) {
      showToast("error", "Password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword(), newPassword());
      showToast("success", "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to change password"));
    } finally {
      setChangingPassword(false);
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
              <Show when={activeTab() === "profile"}>
                <div class={styles.content}>
                  <form
                    onSubmit={(e) => {
                      void saveProfile(e);
                    }}
                  >
                    <section class={styles.block}>
                      <h2 class={styles.title}>Profile information</h2>
                      <p class={styles.description}>
                        Update your personal details.
                      </p>
                      <div class={styles.formGrid}>
                        <Input
                          label="Full name"
                          value={profileName()}
                          onInput={(e) => setProfileName(e.currentTarget.value)}
                          required
                        />
                        <Input
                          label="Email"
                          value={currentUser().email}
                          disabled
                        />
                        <p class={styles.fieldHelper}>
                          Email cannot be changed
                        </p>
                        <Input
                          label="Phone"
                          value={profilePhone()}
                          onInput={(e) =>
                            setProfilePhone(e.currentTarget.value)
                          }
                          required
                        />
                        <div class={styles.readOnlyField}>
                          <span class={styles.readOnlyLabel}>Role</span>
                          <p class={styles.readOnlyValue}>
                            {getRoleLabel(currentUser().role)}
                          </p>
                        </div>
                      </div>
                      <div class={styles.formActions}>
                        <Button type="submit" disabled={savingProfile()}>
                          {savingProfile() ? "Saving..." : "Save changes"}
                        </Button>
                      </div>
                    </section>
                  </form>
                </div>
              </Show>

              <Show when={activeTab() === "preferences"}>
                <div class={styles.content}>
                  <section class={styles.block}>
                    <h2 class={styles.title}>Dashboard</h2>
                    <p class={styles.description}>
                      Customize your dashboard view.
                    </p>
                    <div class={styles.preferenceGroup}>
                      <span class={styles.preferenceLabel}>
                        Default view mode
                      </span>
                      <div class={styles.radioGroup}>
                        <label class={styles.radioLabel}>
                          <input
                            type="radio"
                            name="dashboardView"
                            value="detailed"
                            checked
                          />
                          Detailed
                        </label>
                        <label class={styles.radioLabel}>
                          <input
                            type="radio"
                            name="dashboardView"
                            value="compact"
                          />
                          Compact
                        </label>
                      </div>
                    </div>
                  </section>

                  <section class={styles.block}>
                    <h2 class={styles.title}>Search</h2>
                    <p class={styles.description}>
                      Configure search behavior.
                    </p>
                    <div class={styles.preferenceGroup}>
                      <label class={styles.checkboxLabel}>
                        <input type="checkbox" checked />
                        Auto-detect search type
                      </label>
                      <p class={styles.helperText}>
                        Automatically determine if you're searching by RUC, DNI,
                        phone, or name
                      </p>
                    </div>
                  </section>
                </div>
              </Show>

              <Show when={activeTab() === "security"}>
                <div class={styles.content}>
                  <form
                    onSubmit={(e) => {
                      void handleChangePassword(e);
                    }}
                  >
                    <section class={styles.block}>
                      <h2 class={styles.title}>Change password</h2>
                      <p class={styles.description}>
                        Update your password to keep your account secure.
                      </p>
                      <div class={styles.formGrid}>
                        <Input
                          type="password"
                          label="Current password"
                          value={currentPassword()}
                          onInput={(e) =>
                            setCurrentPassword(e.currentTarget.value)
                          }
                          required
                        />
                        <Input
                          type="password"
                          label="New password"
                          value={newPassword()}
                          onInput={(e) => setNewPassword(e.currentTarget.value)}
                          required
                        />
                        <Input
                          type="password"
                          label="Confirm new password"
                          value={confirmPassword()}
                          onInput={(e) =>
                            setConfirmPassword(e.currentTarget.value)
                          }
                          required
                        />
                      </div>
                      <div class={styles.formActions}>
                        <Button type="submit" disabled={changingPassword()}>
                          {changingPassword()
                            ? "Changing..."
                            : "Change password"}
                        </Button>
                      </div>
                    </section>
                  </form>
                </div>
              </Show>

              <Show when={activeTab() === "general"}>
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
