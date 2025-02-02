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
import EmployeeLayout from "@/components/layout/employee-layout";
import { Fingerprint, Layout, Clock, Shield } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const weekdays = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
];

const settingsSchema = z.object({
  theme: z.enum(["blue", "green", "purple", "orange"]),
  appearance: z.enum(["light", "dark", "system"]),
  animationsEnabled: z.boolean(),
  animationSpeed: z.number().min(0).max(2),
  sidebarCollapsed: z.boolean(),
  autoCheckIn: z.boolean().default(false),
  autoCheckOut: z.boolean().default(false),
  schedules: z.array(z.object({
    weekday: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    enabled: z.boolean().default(true)
  }))
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: settings } = useQuery<SettingsFormValues>({
    queryKey: ["/api/user/settings"],
  });

  const { data: schedules } = useQuery({
    queryKey: ["/api/user/schedules"],
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings || {
      theme: "blue",
      appearance: "light",
      animationsEnabled: true,
      animationSpeed: 1,
      sidebarCollapsed: false,
      autoCheckIn: false,
      autoCheckOut: false,
      schedules: schedules || weekdays.map(day => ({
        weekday: day.value,
        startTime: "09:00",
        endTime: "18:00",
        enabled: true
      }))
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      const { schedules, ...settingsData } = values;
      await apiRequest("PATCH", "/api/user/settings", settingsData);
      await apiRequest("POST", "/api/user/schedules", { schedules });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/schedules"] });
      toast({
        title: "Configuración actualizada",
        description: "Tus preferencias han sido guardadas correctamente.",
      });
    },
  });

  const biometricMutation = useMutation({
    mutationFn: async () => {
      const optionsRes = await apiRequest("GET", "/api/auth/biometric/register");
      const options = await optionsRes.json();
      const credential = await startRegistration(options);
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
      <div className="container mx-auto max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="interface" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="interface" className="space-x-2">
                  <Layout className="h-4 w-4" />
                  <span>Interfaz</span>
                </TabsTrigger>
                <TabsTrigger value="attendance" className="space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Asistencia</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Seguridad</span>
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
                      <h3 className="text-lg font-medium">Fichaje Automático</h3>
                      <FormField
                        control={form.control}
                        name="autoCheckIn"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Entrada Automática</FormLabel>
                              <FormDescription>
                                Fichar entrada automáticamente al obtener la ubicación
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
                        name="autoCheckOut"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Salida Automática</FormLabel>
                              <FormDescription>
                                Fichar salida automáticamente al obtener la ubicación
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

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Horario Laboral</h3>
                      <p className="text-sm text-muted-foreground">
                        Configura los días que necesitas fichar y tu horario de trabajo
                      </p>

                      {weekdays.map((day, index) => (
                        <div key={day.value} className="space-y-2">
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="font-medium">{day.label}</div>
                            <FormField
                              control={form.control}
                              name={`schedules.${index}.enabled`}
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
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
                          {form.watch(`schedules.${index}.enabled`) && (
                            <div className="grid grid-cols-2 gap-4 ml-4">
                              <FormField
                                control={form.control}
                                name={`schedules.${index}.startTime`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Entrada</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="time"
                                        {...field}
                                        className="w-full"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`schedules.${index}.endTime`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Salida</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="time"
                                        {...field}
                                        className="w-full"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="security" className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Autenticación Biométrica</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Configura la autenticación biométrica para un inicio de sesión más seguro
                      </p>
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
    </EmployeeLayout>
  );
}