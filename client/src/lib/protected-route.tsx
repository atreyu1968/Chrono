import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  // Log current state for debugging
  console.log('ProtectedRoute:', {
    path,
    user: user ? { id: user.id, role: user.role } : null,
    isLoading
  });

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // If no user, redirect to auth
  if (!user) {
    console.log('No user found, redirecting to /auth');
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Simple role-based routing logic
  const isAdminUser = user.role === "admin";
  const isAdminRoute = path.startsWith('/admin');

  // Admin users should only access admin routes
  if (isAdminUser && !isAdminRoute) {
    console.log('Admin user detected, redirecting to admin dashboard');
    return (
      <Route path={path}>
        <Redirect to="/admin" />
      </Route>
    );
  }

  // Non-admin users should not access admin routes
  if (!isAdminUser && isAdminRoute) {
    console.log('Non-admin user trying to access admin route, redirecting to check-in');
    return (
      <Route path={path}>
        <Redirect to="/check-in" />
      </Route>
    );
  }

  // If all checks pass, render the component
  return <Route path={path} component={Component} />;
}