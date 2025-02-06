import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/auth-page";
import EmployeeCheckIn from "@/pages/employee/check-in";
import AdminDashboard from "@/pages/admin/dashboard";
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
        <Route path="/admin" component={AdminDashboard} />
        <Route>
          <AdminDashboard />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/check-in" component={EmployeeCheckIn} />
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