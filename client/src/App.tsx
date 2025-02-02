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
import UserAttendancePage from "@/pages/admin/user-attendance";
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
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        {() => {
          if (!user) return <Redirect to="/auth" />;
          return <Redirect to={user.role === "admin" ? "/admin" : "/check-in"} />;
        }}
      </Route>
      <ProtectedRoute path="/admin" component={AdminDashboard} requireAdmin />
      <ProtectedRoute path="/admin/locations" component={AdminLocations} requireAdmin />
      <ProtectedRoute path="/admin/users" component={AdminUsers} requireAdmin />
      <ProtectedRoute path="/admin/departments" component={AdminDepartments} requireAdmin />
      <ProtectedRoute path="/admin/users/:userId/attendance" component={UserAttendancePage} requireAdmin />
      <ProtectedRoute path="/admin/messages" component={AdminMessages} requireAdmin />
      <ProtectedRoute path="/check-in" component={EmployeeCheckIn} />
      <ProtectedRoute path="/attendance" component={EmployeeAttendance} />
      <ProtectedRoute path="/settings" component={EmployeeSettings} />
      <ProtectedRoute path="/messages" component={EmployeeMessages} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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

export default App;