import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Redirect } from "wouter";
import { AuthProvider } from "@/hooks/use-auth";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminLocations from "@/pages/admin/locations";
import AdminUsers from "@/pages/admin/users";
import EmployeeCheckIn from "@/pages/employee/check-in";
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
      <ProtectedRoute path="/check-in" component={EmployeeCheckIn} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;