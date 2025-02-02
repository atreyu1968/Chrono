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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/layout/admin-layout";
import { Layout, Clock } from "lucide-react";

const settingsSchema = z.object({
  singleCheckInPerDay: z.boolean().default(false),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettings() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: settings } = useQuery<SettingsFormValues>({
    queryKey: ["/api/user/settings"],
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings || {
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
            <Tabs defaultValue="attendance" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="attendance" className="space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Asistencia</span>
                </TabsTrigger>
              </TabsList>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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