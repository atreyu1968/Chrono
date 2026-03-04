import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/admin-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const weekdays = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
];

const scheduleSchema = z.object({
  schedules: z.array(z.object({
    weekday: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    enabled: z.boolean().default(true)
  }))
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

export default function UserSchedulesPage() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: schedules } = useQuery<any[]>({
    queryKey: ["/api/admin/user", selectedUser, "schedules"],
    enabled: !!selectedUser,
  });

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      schedules: weekdays.map(day => ({
        weekday: day.value,
        startTime: "09:00",
        endTime: "18:00",
        enabled: true
      }))
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ScheduleFormValues) => {
      if (!selectedUser) throw new Error("No user selected");
      return apiRequest("POST", `/api/admin/user/${selectedUser}/schedules`, values);
    },
    onSuccess: () => {
      toast({
        title: "Horarios actualizados",
        description: "Los horarios del empleado han sido actualizados correctamente.",
      });
    },
  });

  function onSubmit(values: ScheduleFormValues) {
    mutation.mutate(values);
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Horarios de Empleados</CardTitle>
            <CardDescription>
              Configura los horarios y días de fichaje para cada empleado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <FormLabel>Empleado</FormLabel>
                <Select
                  value={selectedUser}
                  onValueChange={setSelectedUser}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUser && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
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

                    <Button type="submit" className="w-full">
                      {mutation.isPending ? "Guardando..." : "Guardar Horarios"}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
