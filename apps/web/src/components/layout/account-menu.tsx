import { useNavigate } from "@solidjs/router";
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
  onOpenSettings?: () => void;
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
          <button
            type="button"
            onClick={() => {
              props.onOpenSettings?.();
              setOpen(false);
              navigate("/settings/profile");
            }}
            class={styles.item}
          >
            <UserRound size={16} />
            Mi perfil
          </button>
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            class={styles.item}
          >
            <Settings size={16} />
            Tema {theme() === "light" ? "claro" : "oscuro"}
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
                .catch(() => undefined);
            }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </Show>
    </div>
  );
}
