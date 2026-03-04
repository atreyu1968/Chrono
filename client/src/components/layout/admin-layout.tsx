import { Link, useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  MapPin,
  Users,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  MessageSquare,
  Bell,
  Calendar as CalendarIcon,
    Clock,
  Layout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as React from "react";
import type { SelectMessage, SelectUserSettings } from "@db/schema";
import logoSolo from "@/assets/images/logo solo.png";
import fondoImg from "@/assets/images/fondo.png";

const profileSchema = z.object({
  fullName: z.string().min(1, "El nombre completo es requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  if (data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden o falta la contraseña actual",
  path: ["confirmPassword"],
});

interface MessageWithUser {
  id: number;
  content: string;
  sentAt: string;
  fromUserId: number;
  toUserId: number;
  read: boolean;
  fromUser: {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    avatar: string | null;
  };
}

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logoutMutation } = useAuth();

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();
    const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(user?.avatar || null);


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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };


  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileMutation = useMutation({
      mutationFn: async (values: z.infer<typeof profileSchema>) => {
          return apiRequest("PATCH", "/api/user/profile", values);
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsProfileOpen(false);
      toast({
        title: "Perfil actualizado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: messages } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000,
  });

    const unreadCount = messages?.filter(m => 
      m.toUserId === user?.id && !m.read
    ).length || 0;

  const menuItems = [
    { icon: LayoutDashboard, label: "Panel", href: "/admin/dashboard" },
    { icon: MapPin, label: "Ubicaciones", href: "/admin/locations" },
    { icon: Users, label: "Usuarios", href: "/admin/users" },
    { icon: Building2, label: "Departamentos", href: "/admin/departments" },
    { icon: Clock, label: "Registros de Asistencia", href: "/admin/attendance-records" },
    { icon: CalendarIcon, label: "Días Festivos", href: "/admin/holidays" },
    {
      icon: MessageSquare,
      label: "Mensajes",
      href: "/admin/messages",
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { icon: Layout, label: "Configuración", href: "/admin/settings" },
  ];

    const MenuContent = () => (
        <div className="space-y-2">
            {menuItems.map(({ icon: Icon, label, href, badge }) => {
                const isActive = location === href || (href === "/admin/dashboard" && location === "/admin");
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
                            {!settings?.sidebarCollapsed && (
                                <span className="flex-1">{label}</span>
                            )}
                            {badge && !settings?.sidebarCollapsed && (
                                <span className="ml-auto bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                                    {badge}
                                </span>
                            )}
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
            <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
          </div>

          <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
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
                    <span className="text-xs text-white/80">Administrador</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DialogTrigger asChild>
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Editar Perfil
                  </DropdownMenuItem>
                </DialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
              </DialogHeader>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))} className="space-y-4">
                      <div className="flex flex-col items-center mb-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={avatarPreview || user?.avatar || undefined} />
                            <AvatarFallback>
                                {user?.fullName?.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                        </Avatar>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="mt-4 w-auto"
                        />
                    </div>
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Cambiar Contraseña</h4>
                    <FormField
                      control={profileForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña Actual</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nueva Contraseña</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    {profileMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={cn(
          "hidden lg:flex flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] bg-[#0F203E] text-white transition-all duration-300",
          settings?.sidebarCollapsed ? "w-16" : "w-64"
        )}>
          <div className="flex flex-col h-full p-4">
            <div className="space-y-2">
              {menuItems.map(({ icon: Icon, label, href }) => {
                const isActive = location === href || (href === "/admin/dashboard" && location === "/admin");
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
};

export default AdminLayout;
