import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AdminLayout from "@/components/layout/admin-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";

const holidaySchema = z.object({
  date: z.date(),
  name: z.string().min(1, "El nombre es requerido"),
  type: z.enum(["nacional", "regional", "local"])
});

type HolidayFormValues = z.infer<typeof holidaySchema>;

export default function HolidaysPage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { data: holidays } = useQuery<any[]>({
    queryKey: ["/api/holidays"],
  });

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      type: "nacional",
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: HolidayFormValues) => {
      return apiRequest("POST", "/api/holidays", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Día festivo añadido",
        description: "El día festivo ha sido añadido correctamente.",
      });
      form.reset();
      setSelectedDate(undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (holidayId: number) => {
      return apiRequest("DELETE", `/api/holidays/${holidayId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Día festivo eliminado",
        description: "El día festivo ha sido eliminado correctamente.",
      });
    },
  });

  function onSubmit(values: HolidayFormValues) {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Debes seleccionar una fecha",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({ ...values, date: selectedDate });
  }

  // Convertir los días festivos a un formato que el calendario pueda entender
  const holidayDates = holidays?.reduce((acc: { [key: string]: string }, holiday: any) => {
    const date = format(new Date(holiday.date), "yyyy-MM-dd");
    acc[date] = holiday.name;
    return acc;
  }, {}) || {};

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="grid gap-8 md:grid-cols-[3fr,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Calendario de Días Festivos</CardTitle>
              <CardDescription>
                Selecciona una fecha para añadir o eliminar días festivos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={es}
                numberOfMonths={3}
                showOutsideDays={false}
                className="rounded-md border w-full [&_.rdp-months]:grid [&_.rdp-months]:grid-cols-3 [&_.rdp-months]:gap-6 [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-cell]:p-0 [&_.rdp-button]:w-10 [&_.rdp-button]:h-10 [&_.rdp-caption]:mb-4 [&_.rdp-nav]:mb-2 [&_.rdp-head_cell]:text-sm [&_.rdp-day]:text-sm"
                modifiers={{
                  holiday: (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return dateStr in holidayDates;
                  }
                }}
                modifiersStyles={{
                  holiday: {
                    backgroundColor: "#fee2e2",
                    color: "#ef4444",
                    fontWeight: "bold"
                  }
                }}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Añadir Día Festivo</CardTitle>
                <CardDescription>
                  Configura los detalles del día festivo seleccionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ej: Día de la Constitución" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona el tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="nacional">Nacional</SelectItem>
                              <SelectItem value="regional">Regional</SelectItem>
                              <SelectItem value="local">Local</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!selectedDate || mutation.isPending}
                    >
                      {mutation.isPending ? "Guardando..." : "Guardar Festivo"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {selectedDate && holidays?.some((h: any) =>
              format(new Date(h.date), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
            ) && (
              <Card>
                <CardHeader>
                  <CardTitle>Festivo Existente</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      const holiday = holidays.find((h: any) =>
                        format(new Date(h.date), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                      );
                      if (holiday) {
                        deleteMutation.mutate(holiday.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Eliminando..." : "Eliminar Festivo"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}