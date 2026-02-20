import { A, useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import LogOut from "~/components/icons/log-out";
import Settings from "~/components/icons/settings";
import UserRound from "~/components/icons/user-round";
import {
  getUserInitials,
  useMenuDismiss,
} from "~/components/layout/account-menu-utils";
import { Button } from "~/components/ui/button";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";
import { cn } from "~/lib/utils";

interface AccountMenuProps {
  fullName: string;
  onLogout: () => Promise<void>;
}

export function AccountMenu(props: AccountMenuProps) {
  const [open, setOpen] = createSignal(false);
  const navigate = useNavigate();
  let containerRef: HTMLDivElement | undefined;
  useMenuDismiss(
    open,
    () => setOpen(false),
    () => containerRef,
  );

  return (
    <div
      ref={(element) => {
        containerRef = element;
      }}
      class="relative"
    >
      <Button
        type="button"
        variant="outline"
        aria-haspopup="menu"
        aria-expanded={open()}
        onClick={() => setOpen((prev) => !prev)}
        class="h-auto w-full justify-start gap-3 rounded-2xl bg-surface px-3 py-2.5 transition-colors hover:bg-card"
      >
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {getUserInitials(props.fullName)}
        </div>
        <div class="flex-1 text-left">
          <p class="text-sm font-medium text-foreground">{props.fullName}</p>
          <p class="text-xs text-muted-foreground">Mi cuenta</p>
        </div>
        <ChevronDown
          class={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open() && "rotate-180",
          )}
        />
      </Button>

      <Show when={open()}>
        <div
          class="crm-overlay-panel absolute inset-x-0 bottom-full mb-2 rounded-2xl p-1.5"
          style={{ "z-index": DS_Z_INDEX.overlay }}
        >
          <A
            href="/profile"
            onClick={() => setOpen(false)}
            class="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-muted"
          >
            <UserRound class="h-4 w-4 text-muted-foreground" />
            Mi perfil
          </A>
          <A
            href="/settings"
            onClick={() => setOpen(false)}
            class="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-muted"
          >
            <Settings class="h-4 w-4 text-muted-foreground" />
            Configuración
          </A>
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
            class="h-auto w-full justify-start gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut class="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </Show>
    </div>
  );
}
