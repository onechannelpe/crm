import { A, useLocation } from "@solidjs/router";
import {
    LayoutDashboard,
    Users,
    Receipt,
    MessageSquare,
    ShieldCheck,
    Package,
    ChevronDown,
    Home,
    Settings,
    FileText
} from "lucide-solid";
import { createResource, For, Show } from "solid-js";
import { getMe, logout } from "~/actions/auth";
import { cn } from "~/lib/utils";

export function Sidebar() {
    const location = useLocation();
    const [user] = createResource(getMe);

    const navGroups = [
        {
            label: "Platform",
            items: [
                { label: "Home", href: "/dashboard", icon: Home },
                { label: "Team", href: "/team", icon: Users },
                { label: "Settings", href: "/settings", icon: Settings },
            ]
        },
        {
            label: "Sales",
            items: [
                { label: "Leads", href: "/leads", icon: Users },
                { label: "Quota", href: "/quota", icon: ShieldCheck },
                { label: "Validation", href: "/validation", icon: MessageSquare },
            ]
        },
        {
            label: "Inventory",
            items: [
                { label: "Stock", href: "/inventory", icon: Package },
            ]
        }
    ];

    return (
        <aside class="fixed inset-y-0 left-0 z-10 w-64 border-r bg-background flex flex-col transition-transform duration-300">
            {/* Logo area */}
            <div class="h-14 flex items-center px-6 border-b">
                <span class="font-bold text-lg tracking-tight">OneChannel</span>
            </div>

            {/* Platform / Context Switcher */}
            <div class="p-4">
                <button class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium border rounded-md shadow-sm bg-white hover:bg-gray-50 transition-colors">
                    <span>{user()?.fullName?.split(' ')[0]}'s Workspace</span>
                    <ChevronDown class="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* Navigation */}
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

            {/* User Footer */}
            <div class="p-4 border-t">
                <button
                    onClick={() => logout()}
                    class="flex items-center gap-3 px-2 w-full hover:bg-muted rounded-md py-2 transition-colors"
                >
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {user()?.fullName?.substring(0, 2).toUpperCase() ?? "ME"}
                    </div>
                    <div class="flex-1 text-left">
                        <p class="text-sm font-medium text-foreground">{user()?.fullName ?? "Loading..."}</p>
                        <p class="text-xs text-muted-foreground">Logout</p>
                    </div>
                </button>
            </div>
        </aside>
    );
}
