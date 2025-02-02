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
import { LogIn, LogOut, MapPin } from "lucide-react";

export default function EmployeeCheckIn() {
  const [location, setLocation] = useState<string>("");
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates>();
  const [hasOpenCheckIn, setHasOpenCheckIn] = useState(false);
  const { toast } = useToast();

  const { data: locations } = useQuery<SelectLocation[]>({
    queryKey: ["/api/locations"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/user/settings"],
  });

  const { data: attendance } = useQuery<any[]>({
    queryKey: ["/api/attendance/history", {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    }],
  });

  useEffect(() => {
    const hasOpen = attendance?.some(
      record => !record.checkOutTime && 
      new Date(record.checkInTime).toDateString() === new Date().toDateString()
    );
    setHasOpenCheckIn(hasOpen || false);
  }, [attendance]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!coordinates || !location) {
        toast({
          title: "Error al fichar",
          description: "Por favor, selecciona una ubicación y permite el acceso a tu ubicación",
          variant: "destructive",
        });
        return;
      }

      return apiRequest("POST", "/api/attendance/check-in", {
        locationId: parseInt(location),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });
    },
    onSuccess: () => {
      toast({
        title: "Fichaje exitoso",
        description: "Tu entrada ha sido registrada",
      });
      setHasOpenCheckIn(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al fichar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/attendance/check-out");
    },
    onSuccess: () => {
      toast({
        title: "Fichaje exitoso",
        description: "Tu salida ha sido registrada",
      });
      setHasOpenCheckIn(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar salida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates(position.coords);
          toast({
            title: "Ubicación obtenida",
            description: "Ya puedes fichar tu entrada",
          });
          if (settings?.autoCheckIn && location) {
            checkInMutation.mutate();
          }
        },
        (error) => {
          toast({
            title: "Error de ubicación",
            description: "Por favor activa los servicios de ubicación para fichar",
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleCheckIn = () => {
    if (!coordinates) {
      getLocation();
    } else if (location) {
      checkInMutation.mutate();
    }
  };

  const handleCheckOut = () => {
    if (settings?.autoCheckOut) {
      checkOutMutation.mutate();
    } else {
      if (window.confirm('¿Estás seguro de que quieres fichar la salida?')) {
        checkOutMutation.mutate();
      }
    }
  };

  return (
    <EmployeeLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {hasOpenCheckIn ? "Registrar Salida" : "Registrar Entrada"}
            </CardTitle>
            {!hasOpenCheckIn && coordinates && (
              <div className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>Ubicación obtenida</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasOpenCheckIn ? (
              <>
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
                  className="w-full h-12 text-lg"
                  variant="default"
                  onClick={handleCheckIn}
                  disabled={!location || checkInMutation.isPending}
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  {checkInMutation.isPending ? "Procesando..." : coordinates ? "Registrar Entrada" : "Obtener Ubicación"}
                </Button>
              </>
            ) : (
              <Button
                className="w-full h-12 text-lg"
                variant="destructive"
                onClick={handleCheckOut}
                disabled={checkOutMutation.isPending}
              >
                <LogOut className="mr-2 h-5 w-5" />
                {checkOutMutation.isPending ? "Procesando..." : "Registrar Salida"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}