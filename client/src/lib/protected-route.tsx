import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  requireAdmin = false,
}: {
  path: string;
  component: () => React.JSX.Element;
  requireAdmin?: boolean;
}) {
  const { user, isLoading } = useAuth();

  console.log('ProtectedRoute:', {
    path,
    user: user ? { id: user.id, role: user.role } : null,
    requireAdmin,
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

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Admin route check
  if (requireAdmin && user.role !== "admin") {
    console.log('Access denied: Non-admin user trying to access admin route');
    return (
      <Route path={path}>
        <Redirect to="/check-in" />
      </Route>
    );
  }

  // Employee route check - redirect admins to admin dashboard
  if (!requireAdmin && user.role === "admin") {
    console.log('Redirecting admin to admin dashboard');
    return (
      <Route path={path}>
        <Redirect to="/admin" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}