import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/auth-page";
import EmployeeCheckIn from "@/pages/employee/check-in";
import EmployeeAttendance from "@/pages/employee/attendance";
import EmployeeMessages from "@/pages/employee/messages";
import EmployeeSettings from "@/pages/employee/settings";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminLocations from "@/pages/admin/locations";
import AdminDepartments from "@/pages/admin/departments";
import AdminAttendanceRecords from "@/pages/admin/attendance-records";
import AdminHolidays from "@/pages/admin/holidays";
import AdminMessages from "@/pages/admin/messages";
import AdminSettings from "@/pages/admin/settings";
import AdminUserAttendance from "@/pages/admin/user-attendance";
import AdminUserSchedules from "@/pages/admin/user-schedules";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route>
          <AuthPage />
        </Route>
      </Switch>
    );
  }

  if (user.role === "admin") {
    return (
      <Switch>
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/locations" component={AdminLocations} />
        <Route path="/admin/departments" component={AdminDepartments} />
        <Route path="/admin/attendance-records" component={AdminAttendanceRecords} />
        <Route path="/admin/holidays" component={AdminHolidays} />
        <Route path="/admin/messages" component={AdminMessages} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/users/:userId/attendance" component={AdminUserAttendance} />
        <Route path="/admin/user-schedules" component={AdminUserSchedules} />
        <Route>
          <AdminDashboard />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/check-in" component={EmployeeCheckIn} />
      <Route path="/attendance" component={EmployeeAttendance} />
      <Route path="/messages" component={EmployeeMessages} />
      <Route path="/settings" component={EmployeeSettings} />
      <Route>
        <EmployeeCheckIn />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Router />
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
