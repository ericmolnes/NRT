"use client";

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
import { LayoutDashboard, Settings } from "lucide-react";
import { categories, getToolsByCategory } from "@/lib/tools-registry";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Innstillinger", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Logo mark */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/90 shadow-sm shadow-sidebar-primary/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 text-sidebar-primary-foreground"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span
              className="text-sm font-bold tracking-tight text-sidebar-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              NRT Tools
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
              Nordic Rig Tech
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plattform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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
                        isActive={pathname.startsWith(tool.url)}
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
