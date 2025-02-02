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
import { MapPin, Calendar as CalendarIcon, CheckCircle2, XCircle } from "lucide-react";
import EmployeeLayout from "@/components/layout/employee-layout";
import type { SelectAttendance, SelectLocation } from "@db/schema";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AttendancePage() {
  const today = new Date();
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(today),
    to: endOfMonth(today)
  });

  const { data: attendance } = useQuery<(SelectAttendance & { location: SelectLocation })[]>({
    queryKey: [
      "/api/attendance/history",
      {
        startDate: date?.from ? format(date.from, "yyyy-MM-dd") : undefined,
        endDate: date?.to ? format(date.to, "yyyy-MM-dd") : undefined,
      },
    ],
    enabled: !!date?.from && !!date?.to,
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
    <EmployeeLayout>
      <div className="container mx-auto py-8">
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
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Centro</TableHead>
                          <TableHead>Horario</TableHead>
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
                                  {format(new Date(record.checkInTime), "EEEE", { locale: es })}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{record.location.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span>{format(new Date(record.checkInTime), "HH:mm")}</span>
                                <span>-</span>
                                <span>
                                  {record.checkOutTime
                                    ? format(new Date(record.checkOutTime), "HH:mm")
                                    : "--:--"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {record.status === "present" ? (
                                <Badge className="bg-green-500 hover:bg-green-600">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Puntual
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="mr-1 h-3 w-3" />
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
                    <Calendar className="h-8 w-8 mx-auto mb-4 opacity-50" />
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
      </div>
    </EmployeeLayout>
  );
}