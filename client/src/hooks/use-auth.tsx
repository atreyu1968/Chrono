import React from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult
} from "@tanstack/react-query";
import type { SelectUser, InsertUser } from "@db/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type LoginData = Pick<InsertUser, "username" | "password">;

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

export const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation<SelectUser, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log('Attempting login with username:', credentials.username);
        const res = await apiRequest("POST", "/api/login", credentials);
        const data = await res.json();
        console.log('Login response:', data);

        if (!res.ok) {
          console.error('Login failed:', data.error);
          throw new Error(data.error || "Error al iniciar sesión");
        }

        console.log('Login successful:', data);
        return data;
      } catch (error) {
        console.error('Login error:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Error al iniciar sesión");
      }
    },
    onSuccess: (userData: SelectUser) => {
      console.log('Login mutation success, user data:', userData);
      queryClient.setQueryData(["/api/user"], userData);
      const route = userData.role === "admin" ? "/admin" : "/check-in";
      console.log('Redirecting to:', route);
      navigate(route);
    },
    onError: (error: Error) => {
      console.error('Login mutation error:', error);
      toast({
        title: "Error de inicio de sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      navigate("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
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