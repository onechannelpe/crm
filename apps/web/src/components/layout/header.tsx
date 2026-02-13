import { Bell, HelpCircle, Search } from "lucide-solid";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export function Header() {
    return (
        <header class="h-14 bg-background border-b flex items-center justify-between px-6 sticky top-0 z-10">
            {/* Breadcrumbs or Page Title Area */}
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <span class="hover:text-foreground cursor-pointer transition-colors">Platform</span>
                <span class="text-gray-300">/</span>
                <span class="font-medium text-foreground">Dashboard</span>
            </div>

            {/* Right Actions */}
            <div class="flex items-center gap-4">
                <div class="hidden md:flex items-center gap-4 mr-4">
                    <a href="#" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
                    <Badge variant="warning" class="bg-orange-50 text-orange-700 border-orange-100">Sandbox</Badge>
                </div>

                <div class="flex items-center gap-2">
                    <Button variant="ghost" size="icon" class="text-muted-foreground">
                        <Search class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" class="text-muted-foreground relative">
                        <Bell class="w-4 h-4" />
                        <span class="absolute top-2 right-2 w-1.5 h-1.5 bg-destructive rounded-full" />
                    </Button>
                    <Button variant="ghost" size="icon" class="text-muted-foreground md:hidden">
                        <HelpCircle class="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
