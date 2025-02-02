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
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/layout/admin-layout";
import { Layout, Clock } from "lucide-react";

const settingsSchema = z.object({
  theme: z.enum(["blue", "green", "purple", "orange"]),
  appearance: z.enum(["light", "dark", "system"]),
  animationsEnabled: z.boolean(),
  animationSpeed: z.number().min(0).max(2),
  sidebarCollapsed: z.boolean(),
  singleCheckInPerDay: z.boolean().default(false),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();

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
      singleCheckInPerDay: false,
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
        description: "Las preferencias han sido guardadas correctamente.",
      });
    },
  });

  function onSubmit(values: SettingsFormValues) {
    mutation.mutate(values);
  }

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="interface" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="interface" className="space-x-2">
                  <Layout className="h-4 w-4" />
                  <span>Interfaz</span>
                </TabsTrigger>
                <TabsTrigger value="attendance" className="space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Asistencia</span>
                </TabsTrigger>
              </TabsList>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <TabsContent value="interface" className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Apariencia</h3>
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
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="appearance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modo de Visualización</FormLabel>
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
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Animaciones</h3>
                      <FormField
                        control={form.control}
                        name="animationsEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Activar Animaciones</FormLabel>
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
                          </FormItem>
                        )}
                      />
                    </div>

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
                  </TabsContent>

                  <TabsContent value="attendance" className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Configuración de Fichaje</h3>
                      <FormField
                        control={form.control}
                        name="singleCheckInPerDay"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Entrada Única por Día</FormLabel>
                              <FormDescription>
                                Limitar a los usuarios a una única entrada y salida por día.
                                Esta configuración afectará a todos los usuarios del sistema.
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
                    </div>
                  </TabsContent>

                  <div className="sticky bottom-0 pt-4 pb-2 bg-background border-t">
                    <Button type="submit" className="w-full">
                      {mutation.isPending ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </form>
              </Form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
