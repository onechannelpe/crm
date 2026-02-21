import { A, useNavigate } from "@solidjs/router";
import { Show, createSignal, onMount } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import LogOut from "~/components/icons/log-out";
import Settings from "~/components/icons/settings";
import UserRound from "~/components/icons/user-round";
import { getUserInitials } from "~/components/layout/account-menu-utils";
import { Button } from "~/components/ui/input/button";
import {
  applyThemeMode,
  getThemeMode,
  saveThemeMode,
  type ThemeMode,
} from "~/components/ui/theme/theme-mode";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { cn } from "~/lib/utils";

interface AccountMenuProps {
  label: string;
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

  onMount(() => {
    setTheme(getThemeMode());
  });

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
        class="relative"
    >
      <Button
        type="button"
        variant="ghost"
        aria-haspopup="menu"
        aria-expanded={open()}
        onClick={() => setOpen((prev) => !prev)}
        class={cn(
          "h-[28px] w-full rounded-sm",
          props.collapsed
            ? "justify-center px-0 hover:bg-[var(--tw-bg-transparent-lighter)]"
            : "justify-start gap-2 px-1 hover:bg-[var(--tw-bg-transparent-lighter)]",
        )}
      >
        <div class="flex h-4 w-4 items-center justify-center rounded-[2px] bg-[var(--tw-workspace-avatar-bg)] text-[10px] font-semibold text-[var(--tw-workspace-avatar-fg)]">
          {getUserInitials(props.label)}
        </div>
        <Show when={!props.collapsed}>
          <span class="truncate text-[13px] font-medium text-foreground">
            {props.label}
          </span>
        </Show>
        <ChevronDown
          class={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            props.collapsed && "hidden",
            open() && "rotate-180",
          )}
        />
      </Button>

      <Show when={open()}>
        <div
          class={cn(
            "crm-overlay-panel absolute top-full mt-2 rounded-sm p-1",
            "left-0 w-[220px]",
          )}
          style={{ "z-index": DS_Z_INDEX.overlay }}
        >
          <A
            href="/profile"
            onClick={() => setOpen(false)}
            class="flex w-full items-center justify-start gap-2 rounded-sm px-2 py-1.5 text-[13px] hover:bg-[var(--tw-bg-transparent-light)]"
          >
            <UserRound class="h-4 w-4 text-muted-foreground" />
            Profile
          </A>
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            class="flex w-full items-center justify-start gap-2 rounded-sm px-2 py-1.5 text-[13px] hover:bg-[var(--tw-bg-transparent-light)]"
          >
            <Settings class="h-4 w-4 text-muted-foreground" />
            Theme · {theme() === "light" ? "Light" : "Dark"}
          </button>
          <div class="my-1 border-t" />
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              void props
                .onLogout()
                .then(() => navigate("/login", { replace: true }))
                .catch((error: unknown) => {
                  console.error("Logout failed", error);
                });
            }}
            class="h-auto w-full justify-start gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] text-destructive hover:bg-destructive/10"
          >
            <LogOut class="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </Show>
    </div>
  );
}
