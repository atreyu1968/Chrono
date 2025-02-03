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

// Helper component for admin-only routes
const AdminRoute = ({ component: Component }: { component: React.ComponentType }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('AdminRoute: No user, redirecting to /auth');
    return <Redirect to="/auth" />;
  }

  if (user.role !== "admin") {
    console.log('AdminRoute: User is not admin, redirecting to /check-in');
    return <Redirect to="/check-in" />;
  }

  console.log('AdminRoute: Rendering admin component for user:', user);
  return <Component />;
};

// Helper component for employee-only routes
const EmployeeRoute = ({ component: Component }: { component: React.ComponentType }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('EmployeeRoute: No user, redirecting to /auth');
    return <Redirect to="/auth" />;
  }

  if (user.role === "admin") {
    console.log('EmployeeRoute: User is admin, redirecting to /admin');
    return <Redirect to="/admin" />;
  }

  console.log('EmployeeRoute: Rendering employee component for user:', user);
  return <Component />;
};

function Router() {
  const { user, isLoading } = useAuth();

  console.log('Router: Current user state:', { user, isLoading });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Switch>
      {/* Auth route */}
      <Route path="/auth">
        {() => {
          console.log('Auth route: Current user:', user);
          if (user) {
            if (user.role === "admin") {
              console.log('Auth route: Redirecting admin to /admin');
              return <Redirect to="/admin" />;
            }
            console.log('Auth route: Redirecting employee to /check-in');
            return <Redirect to="/check-in" />;
          }
          return <AuthPage />;
        }}
      </Route>

      {/* Root route */}
      <Route path="/" exact>
        {() => {
          console.log('Root route: Current user:', user);
          if (!user) {
            return <Redirect to="/auth" />;
          }
          if (user.role === "admin") {
            console.log('Root route: Redirecting admin to /admin');
            return <Redirect to="/admin" />;
          }
          console.log('Root route: Redirecting employee to /check-in');
          return <Redirect to="/check-in" />;
        }}
      </Route>

      {/* Admin routes */}
      <Route path="/admin" exact component={() => <AdminRoute component={AdminDashboard} />} />
      <Route path="/admin/locations" component={() => <AdminRoute component={AdminLocations} />} />
      <Route path="/admin/users" component={() => <AdminRoute component={AdminUsers} />} />
      <Route path="/admin/departments" component={() => <AdminRoute component={AdminDepartments} />} />
      <Route path="/admin/holidays" component={() => <AdminRoute component={AdminHolidays} />} />
      <Route path="/admin/settings" component={() => <AdminRoute component={AdminSettings} />} />
      <Route path="/admin/users/:userId/attendance" component={() => <AdminRoute component={UserAttendancePage} />} />
      <Route path="/admin/attendance-records" component={() => <AdminRoute component={AttendanceRecordsPage} />} />
      <Route path="/admin/messages" component={() => <AdminRoute component={AdminMessages} />} />

      {/* Employee routes */}
      <Route path="/check-in" component={() => <EmployeeRoute component={EmployeeCheckIn} />} />
      <Route path="/attendance" component={() => <EmployeeRoute component={EmployeeAttendance} />} />
      <Route path="/settings" component={() => <EmployeeRoute component={EmployeeSettings} />} />
      <Route path="/messages" component={() => <EmployeeRoute component={EmployeeMessages} />} />

      {/* 404 route */}
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