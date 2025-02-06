import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminLocations from "@/pages/admin/locations";
import AdminUsers from "@/pages/admin/users";
import AdminDepartments from "@/pages/admin/departments";
import AdminHolidays from "@/pages/admin/holidays";
import AdminSettings from "@/pages/admin/settings";
import UserAttendancePage from "@/pages/admin/user-attendance";
import AttendanceRecordsPage from "@/pages/admin/attendance-records";
import EmployeeCheckIn from "@/pages/employee/check-in";
import EmployeeAttendance from "@/pages/employee/attendance";
import EmployeeSettings from "@/pages/employee/settings";
import EmployeeMessages from "@/pages/employee/messages";
import AdminMessages from "@/pages/admin/messages";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user } = useAuth();

  // Redirigir a /auth si no hay usuario
  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route>
          <Route path="*">
            <AuthPage />
          </Route>
        </Route>
      </Switch>
    );
  }

  // Rutas basadas en rol
  if (user.role === "admin") {
    return (
      <Switch>
        {/* Rutas de administrador */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/locations" component={AdminLocations} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/departments" component={AdminDepartments} />
        <Route path="/admin/holidays" component={AdminHolidays} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/users/:userId/attendance" component={UserAttendancePage} />
        <Route path="/admin/attendance-records" component={AttendanceRecordsPage} />
        <Route path="/admin/messages" component={AdminMessages} />
        {/* Redirigir cualquier otra ruta al dashboard de admin */}
        <Route path="*">
          <AdminDashboard />
        </Route>
      </Switch>
    );
  }

  // Rutas de empleado
  return (
    <Switch>
      <Route path="/check-in" component={EmployeeCheckIn} />
      <Route path="/attendance" component={EmployeeAttendance} />
      <Route path="/settings" component={EmployeeSettings} />
      <Route path="/messages" component={EmployeeMessages} />
      {/* Redirigir cualquier otra ruta a check-in */}
      <Route path="*">
        <EmployeeCheckIn />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <div>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <Router />
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}