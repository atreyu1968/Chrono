import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AdminLayout from "@/components/layout/admin-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectAttendance, SelectLocation, SelectUser, SelectDepartment } from "@db/schema";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AttendanceRecordsPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>(undefined);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  const [date, setDate] = useState<DateRange | undefined>();

  // Cargar datos necesarios
  const { data: users } = useQuery<SelectUser[]>({
    queryKey: ["/api/users"],
  });

  const { data: departments } = useQuery<SelectDepartment[]>({
    queryKey: ["/api/departments"],
  });

  const { data: locations } = useQuery<SelectLocation[]>({
    queryKey: ["/api/locations"],
  });

  // Cargar registros de asistencia
  const { data: attendance, isLoading: isLoadingAttendance } = useQuery<
    (SelectAttendance & { location: SelectLocation; user: SelectUser })[]
  >({
    queryKey: [
      "/api/attendance",
      {
        userId: selectedUserId ? Number(selectedUserId) : undefined,
        departmentId: selectedDepartmentId ? Number(selectedDepartmentId) : undefined,
        locationId: selectedLocationId ? Number(selectedLocationId) : undefined,
        startDate: date?.from ? format(date.from, "yyyy-MM-dd") : undefined,
        endDate: date?.to ? format(date.to, "yyyy-MM-dd") : undefined,
      },
    ],
  });

  console.log("[Frontend] Query state:", {
    userId: selectedUserId ? Number(selectedUserId) : undefined,
    departmentId: selectedDepartmentId ? Number(selectedDepartmentId) : undefined,
    locationId: selectedLocationId ? Number(selectedLocationId) : undefined,
    startDate: date?.from ? format(date.from, "yyyy-MM-dd") : undefined,
    endDate: date?.to ? format(date.to, "yyyy-MM-dd") : undefined,
    recordCount: attendance?.length
  });

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Registros de Asistencia</h1>
          <p className="text-muted-foreground">
            Consulta los registros de entrada y salida por usuario y período
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* Filtro de Usuario */}
              <div className="w-[200px]">
                <Select
                  value={selectedUserId}
                  onValueChange={(value) => {
                    console.log("[Frontend] Selected user:", value);
                    setSelectedUserId(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Departamento */}
              <div className="w-[200px]">
                <Select
                  value={selectedDepartmentId}
                  onValueChange={(value) => {
                    console.log("[Frontend] Selected department:", value);
                    setSelectedDepartmentId(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Centro */}
              <div className="w-[200px]">
                <Select
                  value={selectedLocationId}
                  onValueChange={(value) => {
                    console.log("[Frontend] Selected location:", value);
                    setSelectedLocationId(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los centros" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((location) => (
                      <SelectItem key={location.id} value={String(location.id)}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Fecha */}
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
                      <span>Todos los períodos</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoadingAttendance ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p>Cargando registros...</p>
              </div>
            ) : attendance && attendance.length > 0 ? (
              <div className="rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Centro</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Salida</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {format(new Date(record.checkInTime), "dd/MM/yyyy")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(record.checkInTime), "EEEE", {
                                locale: es,
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{record.user?.fullName}</TableCell>
                        <TableCell>{record.user?.department}</TableCell>
                        <TableCell>{record.location?.name}</TableCell>
                        <TableCell>
                          {format(new Date(record.checkInTime), "HH:mm")}
                        </TableCell>
                        <TableCell>
                          {record.checkOutTime
                            ? format(new Date(record.checkOutTime), "HH:mm")
                            : "--:--"}
                        </TableCell>
                        <TableCell>
                          {new Date(record.checkInTime).getHours() < 9 ? (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              Puntual
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Retraso
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-4 opacity-50" />
                <p>No hay registros para los filtros seleccionados</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}