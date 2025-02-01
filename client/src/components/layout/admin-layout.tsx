import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  MapPin,
  Users,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: "Panel", href: "/admin" },
    { icon: MapPin, label: "Ubicaciones", href: "/admin/locations" },
    { icon: Users, label: "Usuarios", href: "/admin/users" },
  ];

  const SidebarContent = () => (
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
      {/* Mobile Menu */}
      <div className="lg:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-2 mt-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <div className="mt-8">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <div className="w-64 min-h-screen bg-white border-r p-4">
          <SidebarContent />
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64">
        {children}
      </main>
    </div>
  );
}