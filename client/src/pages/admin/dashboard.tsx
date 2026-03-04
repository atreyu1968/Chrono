import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, Clock, MapPin } from "lucide-react";

interface AttendanceStats {
  today: number;
  onTime: number;
  late: number;
  trend: { date: string; checkIns: number }[];
}

interface RecentUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface RecentAttendanceRecord {
  id: number;
  checkInTime: string;
  checkOutTime: string | null;
  user: { fullName: string };
}

export default function AdminDashboard() {
  const { data: attendanceStats } = useQuery<AttendanceStats>({
    queryKey: ["/api/attendance/stats"],
  });

  const { data: recentUsers } = useQuery<RecentUser[]>({
    queryKey: ["/api/users/recent"],
  });

  const { data: recentAttendance } = useQuery<RecentAttendanceRecord[]>({
    queryKey: ["/api/attendance/recent"],
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Panel de Control</h1>
          <div className="space-x-2">
            <Button asChild>
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Gestionar Usuarios
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/locations">
                <MapPin className="mr-2 h-4 w-4" />
                Gestionar Ubicaciones
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Fichajes Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-primary" />
                <p className="text-4xl font-bold">{attendanceStats?.today || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>A Tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-green-600" />
                <p className="text-4xl font-bold text-green-600">
                  {attendanceStats?.onTime || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tardanzas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-red-600" />
                <p className="text-4xl font-bold text-red-600">
                  {attendanceStats?.late || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="capitalize">{user.role}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registros de Asistencia Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAttendance?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.user.fullName}</TableCell>
                      <TableCell>
                        {format(new Date(record.checkInTime), "HH:mm", {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>
                        {record.checkOutTime
                          ? format(new Date(record.checkOutTime), "HH:mm", {
                              locale: es,
                            })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tendencia de Asistencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceStats?.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="checkIns"
                    stroke="#1E3A8A"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}