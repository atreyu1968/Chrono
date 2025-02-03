import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/images/logo solo.png";

const loginSchema = z.object({
  username: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function AuthPage() {
  const { loginMutation } = useAuth();
  const [, setLocation] = useLocation();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLogin = async (values: z.infer<typeof loginSchema>) => {
    await loginMutation.mutateAsync(values);
    setLocation("/");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Chrono" className="h-25 mb-4" />
            <h2 className="text-2xl font-bold text-white">
              Bienvenido a Chrono
            </h2>
            <p className="text-base font-medium text-white text-center mt-2">
              Sistema de Control de Asistencia
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ingrese su usuario" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} placeholder="Ingrese su contraseña" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
      <div 
        className="hidden md:block bg-cover bg-center"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1497366754035-f200968a6e72")',
          backgroundColor: 'rgba(30, 58, 138, 0.8)',
          backgroundBlendMode: 'multiply'
        }}
      >
        <div className="flex items-center justify-center h-full text-white p-12">
          <div>
            <h1 className="text-4xl font-bold mb-4">
              Bienvenido al Sistema de Control de Asistencia
            </h1>
            <p className="text-lg opacity-90">
              Gestiona la asistencia de tu lugar de trabajo de manera eficiente con nuestro moderno sistema de fichaje.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}