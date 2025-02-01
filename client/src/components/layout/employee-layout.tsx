import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Clock,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";
import logo from "@/assets/images/logo.png";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  // Get sidebar state from user settings
  const { data: settings } = useQuery({
    queryKey: ["/api/user/settings"],
  });

  // Update sidebar state
  const settingsMutation = useMutation({
    mutationFn: async (collapsed: boolean) => {
      return apiRequest("PATCH", "/api/user/settings", {
        sidebarCollapsed: collapsed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
    },
  });

  const menuItems = [
    { icon: Clock, label: "Fichar", href: "/check-in" },
    { icon: Calendar, label: "Asistencia", href: "/attendance" },
    { icon: MessageSquare, label: "Mensajes", href: "/messages" },
    { icon: Settings, label: "Configuración", href: "/settings" },
  ];

  const MenuContent = () => (
    <div className="flex flex-col gap-2">
      {menuItems.map(({ icon: Icon, label, href }) => {
        const isActive = location === href;
        return (
          <Link key={href} href={href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 text-sm",
                isActive && "bg-primary/10",
                settings?.sidebarCollapsed && "px-2"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
              {!settings?.sidebarCollapsed && label}
            </Button>
          </Link>
        );
      })}
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 text-red-600 mt-auto",
          settings?.sidebarCollapsed && "px-2"
        )}
        onClick={() => logoutMutation.mutate()}
      >
        <LogOut className="h-4 w-4" />
        {!settings?.sidebarCollapsed && "Cerrar Sesión"}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0F203E] text-white shadow-md z-50">
        <div className="container h-full mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-white hover:text-white/90">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <div className="flex items-center justify-between mb-6">
                  <img src={logo} alt="Logo" className="h-8" />
                  <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <MenuContent />
              </SheetContent>
            </Sheet>
            <img src={logo} alt="Logo" className="h-8 hidden lg:block" />
            <h1 className="text-xl font-bold text-white">Sistema de Asistencia</h1>
          </div>
        </div>
      </nav>

      {/* Sidebar and Content */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={cn(
          "hidden lg:flex flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] bg-[#0F203E] text-white p-4 transition-all duration-300",
          settings?.sidebarCollapsed ? "w-16" : "w-64"
        )}>
          <div className="flex flex-col h-full">
            <MenuContent />
            <Button
              variant="ghost"
              size="icon"
              className="mt-4 text-white hover:text-white/90"
              onClick={() => settingsMutation.mutate(!settings?.sidebarCollapsed)}
            >
              {settings?.sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 p-6 transition-all duration-300",
          settings?.sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}>
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}