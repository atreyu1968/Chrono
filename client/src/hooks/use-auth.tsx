import React from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import type { SelectUser, InsertUser } from "@db/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { startAuthentication } from "@simplewebauthn/browser";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  biometricLoginMutation: UseMutationResult<SelectUser, Error, void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('Attempting login with credentials:', { username: credentials.username });
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();
      console.log('Login response:', data);
      return data;
    },
    onSuccess: (user: SelectUser) => {
      console.log('Login successful, user data:', user);
      queryClient.setQueryData(["/api/user"], user);
      // Redirigir basado en el rol
      if (user.role === "admin") {
        console.log('Redirecting admin to /admin');
        setLocation("/admin");
      } else {
        console.log('Redirecting employee to /check-in');
        setLocation("/check-in");
      }
    },
    onError: (error: Error) => {
      console.error('Login error:', error);
      toast({
        title: "Error de inicio de sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", newUser);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Error de registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const biometricLoginMutation = useMutation({
    mutationFn: async () => {
      // 1. Get challenge from server
      const optionsRes = await apiRequest("GET", "/api/auth/biometric/challenge");
      const options = await optionsRes.json();

      // 2. Perform biometric authentication
      const credential = await startAuthentication(options);

      // 3. Verify with server
      const verifyRes = await apiRequest("POST", "/api/auth/biometric/verify", credential);
      return await verifyRes.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Autenticación biométrica exitosa",
        description: "Has iniciado sesión correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de autenticación biométrica",
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
        registerMutation,
        biometricLoginMutation,
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