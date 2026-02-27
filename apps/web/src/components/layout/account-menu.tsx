import { A, useNavigate } from "@solidjs/router";
import { Show, createSignal, onMount } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import LogOut from "~/components/icons/log-out";
import Settings from "~/components/icons/settings";
import UserRound from "~/components/icons/user-round";
import { getUserInitials } from "~/components/layout/account-menu-utils";
import { Avatar } from "~/components/ui/display/avatar";
import {
  applyThemeMode,
  getThemeMode,
  saveThemeMode,
  type ThemeMode,
} from "~/components/ui/theme/theme-mode";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { cn } from "~/lib/utils";

import styles from "./account-menu.module.css";

interface AccountMenuProps {
  label: string;
  avatarUrl?: string | null;
  collapsed?: boolean;
  onLogout: () => Promise<void>;
}

export function AccountMenu(props: AccountMenuProps) {
  const [open, setOpen] = createSignal(false);
  const [theme, setTheme] = createSignal<ThemeMode>("light");
  const navigate = useNavigate();
  let containerRef: HTMLDivElement | undefined;

  useDismissibleLayer({
    enabled: open,
    onDismiss: () => setOpen(false),
    getContainer: () => containerRef,
  });

  onMount(() => setTheme(getThemeMode()));

  const toggleTheme = () => {
    const nextTheme = theme() === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyThemeMode(nextTheme);
    saveThemeMode(nextTheme);
  };

  return (
    <div
      ref={(element) => {
        containerRef = element;
      }}
      class={styles.container}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open()}
        onClick={() => setOpen((prev) => !prev)}
        class={cn(styles.trigger, props.collapsed && styles.triggerCollapsed)}
      >
        <Avatar
          imageUrl={props.avatarUrl ?? null}
          fallback={getUserInitials(props.label)}
          class={styles.avatar}
          fallbackClass={styles.avatarFallback}
        />
        <Show when={!props.collapsed}>
          <span class={styles.label}>{props.label}</span>
        </Show>
        <Show when={!props.collapsed}>
          <ChevronDown
            class={cn(styles.chevron, open() && styles.chevronOpen)}
            size={16}
          />
        </Show>
      </button>

      <Show when={open()}>
        <div class={styles.menu}>
          <A
            href="/settings/profile"
            onClick={() => setOpen(false)}
            class={styles.item}
          >
            <UserRound size={16} />
            Profile
          </A>
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            class={styles.item}
          >
            <Settings size={16} />
            Theme {theme() === "light" ? "Light" : "Dark"}
          </button>
          <hr class={styles.separator} />
          <button
            type="button"
            class={cn(styles.item, styles.danger)}
            onClick={() => {
              setOpen(false);
              void props
                .onLogout()
                .then(() => navigate("/login", { replace: true }))
                .catch((error: unknown) => {
                  console.error("Logout failed", error);
                });
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </Show>
    </div>
  );
}
