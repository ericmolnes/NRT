"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";
import { categories, getToolForPathname } from "@/lib/tools-registry";

function getPageTitle(pathname: string): { title: string; category?: string } {
  if (pathname === "/dashboard") return { title: "Dashboard" };
  if (pathname === "/settings") return { title: "Innstillinger" };

  const matchedTool = getToolForPathname(pathname);

  if (matchedTool) {
    const category = categories.find((c) => c.id === matchedTool.category);
    return { title: matchedTool.name, category: category?.label };
  }

  return { title: "" };
}

interface AppHeaderProps {
  user: { name?: string | null; email?: string | null };
  /**
   * Notification-bell rendres som en slot fra server-side layout slik at
   * vi kan slå opp uleste varsler uten at headeren selv må være en
   * server-komponent. La det være `null` for brukere uten tilgang til
   * varsler.
   */
  notificationBell?: React.ReactNode;
}

export function AppHeader({ user, notificationBell }: AppHeaderProps) {
  const pathname = usePathname();
  const { title, category } = getPageTitle(pathname);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-sm">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />

      {/* Breadcrumb-style page context */}
      <div className="flex items-center gap-2 text-sm">
        {category && (
          <>
            <span className="text-muted-foreground/60">{category}</span>
            <span className="text-muted-foreground/30">/</span>
          </>
        )}
        {title && (
          <span className="font-medium text-foreground">{title}</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Notifikasjons-bjelle (server-rendret slot) */}
      {notificationBell}

      {/* User indicator */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
        <span className="text-sm text-muted-foreground">{user.name}</span>
      </div>
    </header>
  );
}
