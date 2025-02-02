import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import AdminLayout from "@/components/layout/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, MapPin, ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { SelectAttendance, SelectLocation, SelectUser } from "@db/schema";
import { Link, useParams } from "wouter";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function UserAttendancePage() {
  const { userId } = useParams();
  const today = new Date();
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(today),
    to: endOfMonth(today)
  });

  const { data: user, isLoading: isLoadingUser } = useQuery<SelectUser>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  // Después obtener su asistencia usando el ID del usuario
  const { data: attendance, isLoading: isLoadingAttendance } = useQuery<(SelectAttendance & { location: SelectLocation })[]>({
    queryKey: [
      "/api/attendance/user",
      {
        userId,
        startDate: date?.from ? format(date.from, "yyyy-MM-dd") : undefined,
        endDate: date?.to ? format(date.to, "yyyy-MM-dd") : undefined,
      },
    ],
    enabled: !!userId && !!date?.from && !!date?.to,
  });

  // Group attendance records by date
  const attendanceDates = attendance?.reduce((acc, record) => {
    const dateKey = format(new Date(record.checkInTime), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(record);
    return acc;
  }, {} as Record<string, (SelectAttendance & { location: SelectLocation })[]>);

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href="/admin/users">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Usuarios
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Historial de Asistencia</h1>
          <p className="text-muted-foreground">
            {isLoadingUser ? (
              "Cargando usuario..."
            ) : user ? (
              `Usuario: ${user.fullName}`
            ) : (
              "Usuario no encontrado"
            )}
          </p>
        </div>

        {isLoadingUser || isLoadingAttendance ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto mb-4 animate-spin" />
            <p>Cargando datos...</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-[1fr,400px]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Registros de Asistencia</CardTitle>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date?.from ? (
                            date.to ? (
                              <>
                                {format(date.from, "dd/MM/yyyy")} -{" "}
                                {format(date.to, "dd/MM/yyyy")}
                              </>
                            ) : (
                              format(date.from, "dd/MM/yyyy")
                            )
                          ) : (
                            <span>Seleccionar fechas</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={date?.from}
                          selected={date}
                          onSelect={(newDate: DateRange | undefined) => setDate(newDate)}
                          numberOfMonths={2}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardHeader>
                <CardContent>
                  {attendance && attendance.length > 0 ? (
                    <div className="space-y-6">
                      {attendance.map((record) => (
                        <div key={record.id} className="space-y-4 bg-slate-50 p-4 rounded-lg border">
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
                      <p>No hay registros para el período seleccionado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Calendar View */}
            <Card>
              <CardHeader>
                <CardTitle>Vista Mensual</CardTitle>
                <CardDescription>
                  Los días con registros están marcados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="range"
                  selected={date}
                  onSelect={(newDate: DateRange | undefined) => setDate(newDate)}
                  locale={es}
                  modifiers={{
                    marked: (date) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      return Boolean(attendanceDates?.[dateStr]?.length);
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
          </div>
        )}
      </div>
    </AdminLayout>
  );
}