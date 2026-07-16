"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Activity, BarChart3, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" className="border-r bg-white">
      <SidebarHeader className="p-6">
        <div className="flex flex-col">
          <p className="text-[10px] font-bold text-[#A5ADB5] tracking-[0.25em] uppercase">
            Navegación
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold text-[#A5ADB5] uppercase tracking-wider px-4">
            Módulos
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/"} 
                  className="px-4 py-6 hover:bg-accent/10 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                >
                  <Link href="/">
                    <Activity className="w-5 h-5 mr-2" />
                    <span className="font-bold text-sm">Control de Paradas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/eficiencia"} 
                  className="px-4 py-6 hover:bg-accent/10 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                >
                  <Link href="/eficiencia">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    <span className="font-bold text-sm">Eficiencia</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/capacidades"} 
                  className="px-4 py-6 hover:bg-accent/10 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                >
                  <Link href="/capacidades">
                    <Settings2 className="w-5 h-5 mr-2" />
                    <span className="font-bold text-sm">Capacidades Fijas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
