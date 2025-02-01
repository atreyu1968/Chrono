import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import EmployeeLayout from "@/components/layout/employee-layout";
import { apiRequest } from "@/lib/queryClient";
import type { SelectLocation } from "@db/schema";

export default function EmployeeCheckIn() {
  const [location, setLocation] = useState<string>("");
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates>();
  const { toast } = useToast();

  const { data: locations } = useQuery<SelectLocation[]>({
    queryKey: ["/api/locations"],
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!coordinates || !location) return;

      return apiRequest("POST", "/api/attendance/check-in", {
        locationId: parseInt(location),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });
    },
    onSuccess: () => {
      toast({
        title: "Fichaje exitoso",
        description: "Tu asistencia ha sido registrada",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al fichar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCoordinates(position.coords),
        (error) => {
          toast({
            title: "Error de ubicación",
            description: "Por favor activa los servicios de ubicación para fichar",
            variant: "destructive",
          });
        }
      );
    }
  }, []);

  return (
    <EmployeeLayout>
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Fichar Entrada/Salida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar Ubicación</label>
              <Select
                value={location}
                onValueChange={setLocation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={() => checkInMutation.mutate()}
              disabled={!coordinates || !location || checkInMutation.isPending}
            >
              {checkInMutation.isPending ? "Procesando..." : "Fichar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}