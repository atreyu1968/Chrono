import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/auth-page";
import EmployeeCheckIn from "@/pages/employee/check-in";
import EmployeeAttendance from "@/pages/employee/attendance";
import AdminDashboard from "@/pages/admin/dashboard";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user } = useAuth();

  // Debug log
  console.log('Router - User state:', { 
    user: user ? { 
      id: user.id, 
      username: user.username,
      role: user.role 
    } : null 
  });

  // If no user is logged in, show auth page
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

  // Admin routes
  if (user.role === "admin") {
    console.log('Router - Rendering admin routes');
    return (
      <Switch>
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route>
          <AdminDashboard />
        </Route>
      </Switch>
    );
  }

  // Employee routes
  console.log('Router - Rendering employee routes');
  return (
    <Switch>
      <Route path="/check-in" component={EmployeeCheckIn} />
      <Route path="/attendance" component={EmployeeAttendance} />
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