import React from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import type { SelectUser } from "@db/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type LoginCredentials = {
  username: string;
  password: string;
};

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
};

export const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        const data = await res.json();

        if (!res.ok) {
          return { error: data.error || "Error al iniciar sesión" };
        }

        return { user: data };
      } catch (err) {
        return { error: "Error de conexión con el servidor" };
      }
    },
    onSuccess: (result: { user?: SelectUser; error?: string }) => {
      if (result.error) {
        toast({
          title: "Error de inicio de sesión",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (result.user) {
        queryClient.setQueryData(["/api/user"], result.user);
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido, ${result.user.fullName || result.user.username}`,
        });
        navigate(result.user.role === "admin" ? "/admin" : "/check-in");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const data = await res.json();
        return { error: data.error || "Error al cerrar sesión" };
      }
      return { success: true };
    },
    onSuccess: (result: { error?: string; success?: boolean }) => {
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}