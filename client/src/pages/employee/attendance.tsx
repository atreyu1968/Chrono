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
import { Clock, LogIn, LogOut, MapPin } from "lucide-react";
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
        <div className="grid gap-8 md:grid-cols-[1fr,400px]">
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
                    borderRadius: "8px",
                  },
                }}
                className="rounded-md border shadow-sm"
              />
            </CardContent>
          </Card>

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
                    <div key={record.id} className="space-y-4 bg-slate-50 p-4 rounded-lg border">
                      {index > 0 && <hr className="my-4 border-slate-200" />}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-green-600">
                          <LogIn className="h-4 w-4" />
                          <div>
                            <span className="text-sm text-slate-500">Entrada</span>
                            <p className="font-medium">
                              {format(new Date(record.checkInTime), "HH:mm")}
                            </p>
                          </div>
                        </div>
                        {record.checkOutTime && (
                          <div className="flex items-center gap-2 text-red-600">
                            <LogOut className="h-4 w-4" />
                            <div>
                              <span className="text-sm text-slate-500">Salida</span>
                              <p className="font-medium">
                                {format(new Date(record.checkOutTime), "HH:mm")}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-blue-600">
                        <MapPin className="h-4 w-4" />
                        <div>
                          <span className="text-sm text-slate-500">Ubicación</span>
                          <p className="font-medium">{record.location.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Estado</span>
                        </div>
                        <Badge
                          variant={record.status === "present" ? "default" : "destructive"}
                          className="capitalize"
                        >
                          {record.status === "present" ? "Puntual" : "Tarde"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <p>No hay registros para este día</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </EmployeeLayout>
  );
}