import { A, useLocation } from "@solidjs/router";
import { createResource, For } from "solid-js";
import { getMe, logout } from "~/actions/auth-session";
import ChevronDown from "~/components/icons/chevron-down";
import House from "~/components/icons/house";
import MessageSquare from "~/components/icons/message-square";
import Package from "~/components/icons/package";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import Users from "~/components/icons/users";
import { AccountMenu } from "~/components/layout/account-menu";
import { cn } from "~/lib/utils";

export function Sidebar() {
    const location = useLocation();
    const [user] = createResource(getMe);

    const navGroups = [
        {
            label: "Plataforma",
            items: [
                { label: "Inicio", href: "/dashboard", icon: House },
                { label: "Equipo", href: "/team", icon: Users },
                { label: "Configuración", href: "/settings", icon: Settings },
            ]
        },
        {
            label: "Ventas",
            items: [
                { label: "Leads", href: "/leads", icon: Users },
                { label: "Cuota", href: "/quota", icon: ShieldCheck },
                { label: "Validación", href: "/validation", icon: MessageSquare },
            ]
        },
        {
            label: "Inventario",
            items: [
                { label: "Inventario", href: "/inventory", icon: Package },
            ]
        }
    ];

    return (
        <aside class="fixed inset-y-0 left-0 z-10 w-64 border-r bg-background flex flex-col transition-transform duration-300">
            <div class="h-14 flex items-center px-6 border-b">
                <span class="font-bold text-lg tracking-tight">OneChannel</span>
            </div>

            <div class="p-4">
                <button type="button" class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium border rounded-md shadow-sm bg-white hover:bg-gray-50 transition-colors">
                    <span>Espacio de {user()?.fullName?.split(" ")[0]}</span>
                    <ChevronDown class="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            <nav class="flex-1 overflow-y-auto px-4 space-y-6">
                <For each={navGroups}>
                    {(group) => (
                        <div class="space-y-1">
                            {group.label && (
                                <h4 class="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    {group.label}
                                </h4>
                            )}
                            <For each={group.items}>
                                {(item) => {
                                    const isActive = () => location.pathname.startsWith(item.href);
                                    return (
                                        <A
                                            href={item.href}
                                            class={cn(
                                                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                                isActive()
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <item.icon class={cn("w-4 h-4", isActive() ? "text-primary" : "text-muted-foreground")} />
                                            {item.label}
                                        </A>
                                    );
                                }}
                            </For>
                        </div>
                    )}
                </For>
            </nav>

            <div class="p-4 border-t">
                <AccountMenu fullName={user()?.fullName ?? "Cargando..."} onLogout={logout} />
            </div>
        </aside>
    );
}
