import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Clock, LogIn, LogOut } from "lucide-react";
import EmployeeLayout from "@/components/layout/employee-layout";
import { useToast } from "@/hooks/use-toast";
import type { SelectAttendance, SelectLocation } from "@db/schema";

export default function AttendancePage() {
  const [date, setDate] = useState<Date>(new Date());
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  const { data: attendance } = useQuery<(SelectAttendance & { location: SelectLocation })[]>({
    queryKey: [
      "/api/attendance/history",
      {
        startDate: format(monthStart, "yyyy-MM-dd"),
        endDate: format(monthEnd, "yyyy-MM-dd"),
      },
    ],
  });

  // Group attendance records by date
  const attendanceDates = attendance?.reduce((acc, record) => {
    const dateKey = new Date(record.checkInTime).toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(record);
    return acc;
  }, {} as Record<string, (SelectAttendance & { location: SelectLocation })[]>);

  const selectedDateStr = format(date, "yyyy-MM-dd");
  const selectedDateRecords = attendanceDates?.[selectedDateStr] || [];

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
                  marked: (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return attendanceDates?.[dateStr]?.length > 0;
                  },
                }}
                modifiersStyles={{
                  marked: {
                    fontWeight: "bold",
                    border: "2px solid var(--primary)",
                  },
                }}
                className="rounded-md border shadow-sm"
              />
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
                {selectedDateRecords.length > 0 ? (
                  <div className="space-y-6">
                    {selectedDateRecords.map((record, index) => (
                      <div key={record.id} className="space-y-4">
                        {index > 0 && <hr className="my-4" />}
                        <div className="flex items-center gap-2">
                          <LogIn className="h-4 w-4 text-green-500" />
                          <span className="font-medium">Entrada:</span>
                          {format(new Date(record.checkInTime), "HH:mm")}
                        </div>
                        {record.checkOutTime && (
                          <div className="flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-red-500" />
                            <span className="font-medium">Salida:</span>
                            {format(new Date(record.checkOutTime), "HH:mm")}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Ubicación:</span>
                          {record.location.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Estado:</span>
                          <Badge
                            variant={record.status === "present" ? "default" : "destructive"}
                          >
                            {record.status === "present" ? "Puntual" : "Tarde"}
                          </Badge>
                        </div>
                      </div>
                    ))}
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