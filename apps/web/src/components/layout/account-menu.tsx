import { A } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { ChevronDown, LogOut, Settings, UserRound } from "~/components/layout/icons";
import { getUserInitials, useMenuDismiss } from "~/components/layout/account-menu-utils";
import { cn } from "~/lib/utils";

interface AccountMenuProps {
    fullName: string;
    onLogout: () => Promise<void>;
}

export function AccountMenu(props: AccountMenuProps) {
    const [open, setOpen] = createSignal(false);
    let containerRef: HTMLDivElement | undefined;
    useMenuDismiss(open, () => setOpen(false), () => containerRef);

    return (
        <div ref={containerRef} class="relative">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open()}
                onClick={() => setOpen((prev) => !prev)}
                class="flex w-full items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
            >
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {getUserInitials(props.fullName)}
                </div>
                <div class="flex-1 text-left">
                    <p class="text-sm font-medium text-foreground">{props.fullName}</p>
                    <p class="text-xs text-muted-foreground">Mi cuenta</p>
                </div>
                <ChevronDown class={cn("h-4 w-4 text-muted-foreground transition-transform", open() && "rotate-180")} />
            </button>

            <Show when={open()}>
                <div class="absolute inset-x-0 bottom-full z-20 mb-2 rounded-md border bg-background p-1 shadow-sm">
                    <A href="/profile" onClick={() => setOpen(false)} class="flex items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-muted">
                        <UserRound class="h-4 w-4 text-muted-foreground" />
                        Mi perfil
                    </A>
                    <A href="/settings" onClick={() => setOpen(false)} class="flex items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-muted">
                        <Settings class="h-4 w-4 text-muted-foreground" />
                        Configuración
                    </A>
                    <div class="my-1 border-t" />
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            void props.onLogout();
                        }}
                        class="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                    >
                        <LogOut class="h-4 w-4" />
                        Cerrar sesión
                    </button>
                </div>
            </Show>
        </div>
    );
}
