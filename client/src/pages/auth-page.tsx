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
    try {
      console.log('Attempting login with values:', { username: values.username });
      const user = await loginMutation.mutateAsync(values);
      console.log('Login response:', user);

      if (user.role === "admin") {
        console.log('Redirecting admin to dashboard');
        setLocation("/admin/dashboard");
      } else {
        console.log('Redirecting employee to check-in');
        setLocation("/check-in");
      }
    } catch (error) {
      console.error("Error during login:", error);
      // Reset the form if login fails
      loginForm.reset();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Chrono" className="h-20 mb-4" />
          <h2 className="text-2xl font-bold">Bienvenido a Chrono</h2>
          <p className="text-base text-muted-foreground text-center mt-2">
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
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}