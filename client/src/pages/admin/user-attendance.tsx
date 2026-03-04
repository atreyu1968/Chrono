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

  console.log("[Frontend] Loading user data:", {
    userId,
    isLoadingUser,
    user
  });

  const { data: attendance, isLoading: isLoadingAttendance } = useQuery<(SelectAttendance & { location: SelectLocation })[]>({
    queryKey: [
      "/api/attendance/user",
      {
        userId: String(userId),
      },
    ],
    enabled: !!userId,
  });

  console.log("[Frontend] Attendance query state:", {
    userId,
    isLoadingAttendance,
    hasData: !!attendance,
    recordsCount: attendance?.length
  });

  if (!attendance) {
    console.log("[Frontend] No attendance data available");
    return (
      <AdminLayout>
        <div className="container mx-auto py-8">
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <p>No hay registros disponibles</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

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
                  <CardTitle>Registros de Asistencia</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendance.length > 0 ? (
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
                              <p className="font-medium">{record.location?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">Estado</span>
                            </div>
                            <Badge
                              variant={new Date(record.checkInTime).getHours() < 9 ? "default" : "destructive"}
                              className="capitalize"
                            >
                              {new Date(record.checkInTime).getHours() < 9 ? "Puntual" : "Tarde"}
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
          </div>
        )}
      </div>
    </AdminLayout>
  );
}