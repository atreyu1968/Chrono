import { Link, useLocation } from "wouter";
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
import logo from "@/assets/images/logo.png";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as React from "react";
import { FileUploader } from "@/components/ui/file-uploader";

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();
    const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(user?.avatar || null);


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

    const handleFileChange = (file: File) => {
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
          if (avatarFile) {
              const formData = new FormData();
              formData.append('avatar', avatarFile);
              formData.append('data', JSON.stringify(values));
              return apiRequest("PATCH", "/api/user/profile", formData, {
                  headers: {
                      'Content-Type': 'multipart/form-data',
                  },
              });
          }
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

  const menuItems = [
    { icon: LayoutDashboard, label: "Panel", href: "/admin" },
    { icon: MapPin, label: "Ubicaciones", href: "/admin/locations" },
    { icon: Users, label: "Usuarios", href: "/admin/users" },
    { icon: Building2, label: "Departamentos", href: "/admin/departments" },
  ];

  const MenuContent = () => (
    <div className="space-y-2">
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
              <SheetContent side="left" className="w-64">
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <img src={logo} alt="Chrono" className="h-8" />
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <MenuContent />
                </div>
              </SheetContent>
            </Sheet>
            <img src={logo} alt="Logo" className="h-8 hidden lg:block" />
            <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
          </div>

          {/* User Profile */}
          <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-white">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>
                      {user?.fullName?.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{user?.fullName}</span>
                    <span className="text-xs opacity-90">Administrador</span>
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
                            <AvatarImage src={avatarPreview || user?.avatar} />
                            <AvatarFallback>
                                {user?.fullName?.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                        </Avatar>
                        <FileUploader
                            onFileSelect={handleFileChange}
                            accept="image/*"
                            className="mt-4"
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
          "flex-1 p-6 transition-all duration-300 relative",
          settings?.sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}>
          {/* Background with watermark effect */}
          <div 
            className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
            style={{ 
              backgroundImage: 'url("/fondo.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* Content container */}
          <div className="container mx-auto relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}