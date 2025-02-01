import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Clock,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: Clock, label: "Fichar", href: "/check-in" },
    { icon: MessageSquare, label: "Mensajes", href: "/messages" },
    { icon: Settings, label: "Configuración", href: "/settings" },
  ];

  const MenuContent = () => (
    <div className="space-y-4">
      {menuItems.map(({ icon: Icon, label, href }) => (
        <Link key={href} href={href}>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
          >
            <Icon className="h-5 w-5" />
            {label}
          </Button>
        </Link>
      ))}
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 text-red-600"
        onClick={() => logoutMutation.mutate()}
      >
        <LogOut className="h-5 w-5" />
        Cerrar Sesión
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="mt-8">
                <MenuContent />
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-bold text-primary">Sistema de Asistencia</h1>
        </div>
        <div className="hidden lg:flex items-center gap-4">
          <MenuContent />
        </div>
      </nav>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}