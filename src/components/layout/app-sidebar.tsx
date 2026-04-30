"use client";

import type { ComponentType } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/layout/nav-user";
import { NrtLogo } from "@/components/brand/nrt-logo";
import { Bot, LayoutDashboard, Settings } from "lucide-react";
import type { AccessLevel } from "@/lib/access/get-current-access";
import {
  categories,
  getToolsByCategory,
  isToolActiveForPathname,
} from "@/lib/tools-registry";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  {
    title: "Assistent",
    url: "/assistant",
    icon: Bot,
    minimumAccess: "USER",
  },
  { title: "Innstillinger", url: "/settings", icon: Settings },
] satisfies Array<{
  title: string;
  url: string;
  icon: ComponentType;
  minimumAccess?: Exclude<AccessLevel, "MINIMUM">;
}>;

const ACCESS_RANK: Record<AccessLevel, number> = {
  MINIMUM: 0,
  USER: 1,
  ADMIN: 2,
};

interface AppSidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  accessLevel: AccessLevel;
}

export function AppSidebar({ user, accessLevel }: AppSidebarProps) {
  const pathname = usePathname();
  const visibleNavItems = navItems.filter((item) => {
    if (!item.minimumAccess) return true;
    return ACCESS_RANK[accessLevel] >= ACCESS_RANK[item.minimumAccess];
  });

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-4 py-3">
          {/* NRT Logo mark */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/15">
            <NrtLogo size={20} className="text-sidebar-primary" />
            <div className="pointer-events-none absolute inset-0 rounded-lg" style={{ boxShadow: "0 0 12px oklch(0.89 0.17 178 / 20%)" }} />
          </div>
          <div className="flex flex-col">
            <span
              className="text-sm font-bold tracking-tight text-sidebar-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Nordic RigTech
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plattform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {categories.map((category) => {
          const categoryTools = getToolsByCategory(category.id);
          if (categoryTools.length === 0) return null;
          return (
            <SidebarGroup key={category.id}>
              <SidebarGroupLabel>{category.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {categoryTools.map((tool) => (
                    <SidebarMenuItem key={tool.id}>
                      <SidebarMenuButton
                        render={<Link href={tool.url} />}
                        isActive={isToolActiveForPathname(tool, pathname)}
                      >
                        <tool.icon />
                        <span>{tool.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
