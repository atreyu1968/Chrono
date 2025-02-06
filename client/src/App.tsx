import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Redirect } from "wouter";
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

  return (
    <Switch>
      {/* Ruta de autenticación */}
      <Route path="/auth">
        {() => {
          if (user) {
            if (user.role === "admin") {
              return <Redirect to="/admin" />;
            } else {
              return <Redirect to="/check-in" />;
            }
          }
          return <AuthPage />;
        }}
      </Route>

      {/* Ruta raíz */}
      <Route path="/">
        {() => {
          if (!user) {
            return <Redirect to="/auth" />;
          }
          return user.role === "admin" ? (
            <Redirect to="/admin" />
          ) : (
            <Redirect to="/check-in" />
          );
        }}
      </Route>

      {/* Rutas de administrador */}
      <Route path="/admin">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role !== "admin") return <Redirect to="/check-in" />;
          return <AdminDashboard />;
        }}
      </Route>
      <Route path="/admin/locations">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role !== "admin") return <Redirect to="/check-in" />;
          return <AdminLocations />;
        }}
      </Route>
      <Route path="/admin/users">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role !== "admin") return <Redirect to="/check-in" />;
          return <AdminUsers />;
        }}
      </Route>
      <Route path="/admin/departments">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role !== "admin") return <Redirect to="/check-in" />;
          return <AdminDepartments />;
        }}
      </Route>
      <Route path="/admin/holidays">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role !== "admin") return <Redirect to="/check-in" />;
          return <AdminHolidays />;
        }}
      </Route>
      <Route path="/admin/settings">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role !== "admin") return <Redirect to="/check-in" />;
          return <AdminSettings />;
        }}
      </Route>
      <Route path="/admin/users/:userId/attendance">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role !== "admin") return <Redirect to="/check-in" />;
          return <UserAttendancePage />;
        }}
      </Route>
      <Route path="/admin/attendance-records">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role !== "admin") return <Redirect to="/check-in" />;
          return <AttendanceRecordsPage />;
        }}
      </Route>
      <Route path="/admin/messages">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role !== "admin") return <Redirect to="/check-in" />;
          return <AdminMessages />;
        }}
      </Route>

      {/* Rutas de empleado */}
      <Route path="/check-in">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role === "admin") return <Redirect to="/admin" />;
          return <EmployeeCheckIn />;
        }}
      </Route>
      <Route path="/attendance">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role === "admin") return <Redirect to="/admin" />;
          return <EmployeeAttendance />;
        }}
      </Route>
      <Route path="/settings">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role === "admin") return <Redirect to="/admin" />;
          return <EmployeeSettings />;
        }}
      </Route>
      <Route path="/messages">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          if (user.role === "admin") return <Redirect to="/admin" />;
          return <EmployeeMessages />;
        }}
      </Route>

      {/* Ruta 404 */}
      <Route component={NotFound} />
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