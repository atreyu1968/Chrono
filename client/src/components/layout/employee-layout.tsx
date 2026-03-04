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
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SelectUserSettings } from "@db/schema";
import logoSolo from "@/assets/images/logo solo.png";
import fondoImg from "@/assets/images/fondo.png";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const { data: settings } = useQuery<SelectUserSettings>({
    queryKey: ["/api/user/settings"],
  });

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
    <div className="flex flex-col h-full">
      <div className="space-y-2">
        {menuItems.map(({ icon: Icon, label, href }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 text-sm font-medium",
                  isActive && "bg-white/10 text-white",
                  !isActive && "text-white/80 hover:text-white hover:bg-white/10",
                  settings?.sidebarCollapsed && "px-2"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive && "text-white")} />
                {!settings?.sidebarCollapsed && label}
              </Button>
            </Link>
          );
        })}
      </div>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-auto",
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
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0F203E] text-white shadow-md z-50">
        <div className="container h-full mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-white hover:text-white/90">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-6">
                    <img src={logoSolo} alt="Logo" className="h-8" />
                    <span className="text-xl font-bold">Chrono</span>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="ml-auto">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <MenuContent />
                </div>
              </SheetContent>
            </Sheet>
            <div className="hidden lg:flex items-center gap-2">
              <img src={logoSolo} alt="Logo" className="h-8" />
              <span className="text-xl font-bold">Chrono</span>
            </div>
            <h1 className="text-xl font-bold text-white">Sistema de Asistencia</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback>
                    {user?.fullName?.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold">{user?.fullName}</span>
                  <span className="text-xs text-white/80">Empleado</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href="/settings">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Editar Perfil
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={cn(
          "hidden lg:flex flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] bg-[#0F203E] text-white transition-all duration-300",
          settings?.sidebarCollapsed ? "w-16" : "w-64"
        )}>
          <div className="flex flex-col h-full p-4">
            <MenuContent />
            <Button
              variant="ghost"
              size="icon"
              className="mt-4 text-white/80 hover:text-white"
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

        <main className={cn(
          "flex-1 p-6 transition-all duration-300 relative",
          settings?.sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}>
          <div 
            className="fixed inset-0 z-0 opacity-[0.15] pointer-events-none"
            style={{ 
              backgroundImage: `url("${fondoImg}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />

          <div className="container mx-auto relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
