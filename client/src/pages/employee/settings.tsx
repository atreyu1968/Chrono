import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import EmployeeLayout from "@/components/layout/employee-layout";
import { Fingerprint } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

const settingsSchema = z.object({
  theme: z.enum(["blue", "green", "purple", "orange"]),
  appearance: z.enum(["light", "dark", "system"]),
  animationsEnabled: z.boolean(),
  animationSpeed: z.number().min(0).max(2),
  sidebarCollapsed: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: settings } = useQuery<SettingsFormValues>({
    queryKey: ["/api/user/settings"],
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings || {
      theme: "blue",
      appearance: "light",
      animationsEnabled: true,
      animationSpeed: 1,
      sidebarCollapsed: false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      return apiRequest("PATCH", "/api/user/settings", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({
        title: "Configuración actualizada",
        description: "Tus preferencias han sido guardadas correctamente.",
      });
    },
  });

  const biometricMutation = useMutation({
    mutationFn: async () => {
      // 1. Get registration options from server
      const optionsRes = await apiRequest("GET", "/api/auth/biometric/register");
      const options = await optionsRes.json();

      // 2. Create credentials
      const credential = await startRegistration(options);

      // 3. Verify with server
      return apiRequest("POST", "/api/auth/biometric/verify-registration", credential);
    },
    onSuccess: () => {
      toast({
        title: "Autenticación biométrica registrada",
        description: "Ahora puedes usar la autenticación biométrica para iniciar sesión.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar autenticación biométrica",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: SettingsFormValues) {
    mutation.mutate(values);
  }

  return (
    <EmployeeLayout>
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuración de la Interfaz</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tema de Colores</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tema" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="blue">Azul</SelectItem>
                          <SelectItem value="green">Verde</SelectItem>
                          <SelectItem value="purple">Púrpura</SelectItem>
                          <SelectItem value="orange">Naranja</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Personaliza los colores de la interfaz
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="appearance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apariencia</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el modo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="light">Claro</SelectItem>
                          <SelectItem value="dark">Oscuro</SelectItem>
                          <SelectItem value="system">Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Ajusta el modo de visualización
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="animationsEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Animaciones</FormLabel>
                        <FormDescription>
                          Activa o desactiva las animaciones de la interfaz
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="animationSpeed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Velocidad de Animaciones</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={2}
                          step={0.1}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Ajusta la velocidad de las animaciones
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sidebarCollapsed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Barra Lateral Colapsada</FormLabel>
                        <FormDescription>
                          Mantén la barra lateral minimizada por defecto
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  {mutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </form>
            </Form>

            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Seguridad</h3>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => biometricMutation.mutate()}
                disabled={biometricMutation.isPending}
              >
                {biometricMutation.isPending ? (
                  "Registrando..."
                ) : (
                  <>
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Configurar Autenticación Biométrica
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}