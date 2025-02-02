import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut } from "lucide-react";
import EmployeeLayout from "@/components/layout/employee-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SelectAttendance } from "@db/schema";

export default function AttendancePage() {
  const [date, setDate] = useState<Date>(new Date());
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const { toast } = useToast();

  const { data: attendance } = useQuery<SelectAttendance[]>({
    queryKey: [
      "/api/attendance/history",
      {
        startDate: format(monthStart, "yyyy-MM-dd"),
        endDate: format(monthEnd, "yyyy-MM-dd"),
      },
    ],
  });

  const attendanceDates = attendance?.reduce((acc, record) => {
    if (record.checkInTime) {
      const date = new Date(record.checkInTime);
      if (!isNaN(date.getTime())) {
        acc[date.toDateString()] = record;
      }
    }
    return acc;
  }, {} as Record<string, SelectAttendance>);

  // Mutation para registrar la salida
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/attendance/check-out");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
      toast({
        title: "Salida registrada correctamente",
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

  // Verificar si hay un registro de entrada sin salida
  const hasOpenCheckIn = attendance?.some(
    (record) => !record.checkOutTime && new Date(record.checkInTime).toDateString() === new Date().toDateString()
  );

  return (
    <EmployeeLayout>
      <div className="container mx-auto py-8">
        <div className="grid gap-8 md:grid-cols-[1fr,300px]">
          <Card>
            <CardHeader>
              <CardTitle>Calendario de Asistencia</CardTitle>
              <CardDescription>
                Selecciona una fecha para ver los detalles de tu asistencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                locale={es}
                modifiers={{
                  marked: (date) =>
                    attendanceDates?.[date.toDateString()] !== undefined,
                }}
                modifiersStyles={{
                  marked: {
                    fontWeight: "bold",
                    border: "2px solid var(--primary)",
                  },
                }}
                className="rounded-md border shadow-sm"
              />
              {/* Botón de registro de salida */}
              {hasOpenCheckIn && (
                <div className="mt-4">
                  <Button
                    className="w-full"
                    onClick={() => checkOutMutation.mutate()}
                    disabled={checkOutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {checkOutMutation.isPending ? "Registrando salida..." : "Registrar Salida"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Día</CardTitle>
                <CardDescription>
                  {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceDates?.[date.toDateString()] ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Entrada:</span>
                      {format(
                        new Date(
                          attendanceDates[date.toDateString()].checkInTime
                        ),
                        "HH:mm"
                      )}
                    </div>
                    {attendanceDates[date.toDateString()].checkOutTime && (
                      <div className="flex items-center gap-2">
                        <LogOut className="h-4 w-4 text-red-500" />
                        <span className="font-medium">Salida:</span>
                        {format(
                          new Date(
                            attendanceDates[date.toDateString()].checkOutTime!
                          ),
                          "HH:mm"
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Estado:</span>
                      <Badge
                        variant={
                          attendanceDates[date.toDateString()].status === "present"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {attendanceDates[date.toDateString()].status === "present"
                          ? "Puntual"
                          : "Tarde"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No hay registros para este día
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
}