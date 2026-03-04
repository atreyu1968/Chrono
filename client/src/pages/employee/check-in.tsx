import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { SelectLocation, SelectUserSettings } from "@db/schema";
import { LogIn, LogOut, MapPin, Loader2, RefreshCw, Navigation, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

function getDistanceFromLatLonInMeters(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type GeoStatus = "idle" | "loading" | "success" | "error";

export default function EmployeeCheckIn() {
  const [locationId, setLocationId] = useState<string>("");
  const [coordinates, setCoordinates] = useState<GeolocationCoordinates>();
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [geoError, setGeoError] = useState<string>("");
  const [hasOpenCheckIn, setHasOpenCheckIn] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations } = useQuery<SelectLocation[]>({
    queryKey: ["/api/locations"],
  });

  const { data: settings } = useQuery<SelectUserSettings>({
    queryKey: ["/api/user/settings"],
  });

  const today = new Date().toISOString().split("T")[0];
  const { data: attendanceData } = useQuery<any[]>({
    queryKey: [`/api/attendance/history?startDate=${today}&endDate=${today}`],
  });

  useEffect(() => {
    const hasOpen = attendanceData?.some(
      (record) =>
        !record.checkOutTime &&
        new Date(record.checkInTime).toDateString() === new Date().toDateString()
    );
    setHasOpenCheckIn(hasOpen || false);
  }, [attendanceData]);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      setGeoError("Tu navegador no soporta geolocalización");
      return;
    }

    setGeoStatus("loading");
    setGeoError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates(position.coords);
        setGeoStatus("success");
      },
      (error) => {
        setGeoStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError(
              "Permiso de ubicación denegado. Actívalo en la configuración de tu navegador."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("No se pudo determinar tu ubicación. Verifica que el GPS esté activado.");
            break;
          case error.TIMEOUT:
            setGeoError("Tiempo de espera agotado. Intenta en un lugar con mejor señal GPS.");
            break;
          default:
            setGeoError("Error desconocido al obtener la ubicación.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    requestGeolocation();
  }, [requestGeolocation]);

  const selectedLocation = locations?.find(
    (loc) => loc.id.toString() === locationId
  );

  const distanceToLocation =
    coordinates && selectedLocation
      ? getDistanceFromLatLonInMeters(
          coordinates.latitude,
          coordinates.longitude,
          selectedLocation.latitude,
          selectedLocation.longitude
        )
      : null;

  const isWithinRadius =
    distanceToLocation !== null && selectedLocation
      ? distanceToLocation <= selectedLocation.radius
      : null;

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!coordinates || !locationId) {
        throw new Error("Selecciona una ubicación y permite el acceso GPS");
      }

      const res = await apiRequest("POST", "/api/attendance/check-in", {
        locationId: parseInt(locationId),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Entrada registrada",
        description: "Tu fichaje de entrada ha sido registrado correctamente",
      });
      setHasOpenCheckIn(true);
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
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
      const res = await apiRequest("POST", "/api/attendance/check-out");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Salida registrada",
        description: "Tu fichaje de salida ha sido registrado correctamente",
      });
      setHasOpenCheckIn(false);
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar salida",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckIn = () => {
    if (geoStatus !== "success") {
      requestGeolocation();
      return;
    }
    if (!locationId) {
      toast({
        title: "Selecciona ubicación",
        description: "Elige una ubicación antes de fichar",
        variant: "destructive",
      });
      return;
    }
    checkInMutation.mutate();
  };

  const handleCheckOut = () => {
    if (settings?.autoCheckOut) {
      checkOutMutation.mutate();
    } else {
      if (window.confirm("¿Estás seguro de que quieres fichar la salida?")) {
        checkOutMutation.mutate();
      }
    }
  };

  return (
    <EmployeeLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">
              {hasOpenCheckIn ? "Registrar Salida" : "Registrar Entrada"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Navigation className="h-4 w-4" />
                  <span>Estado GPS</span>
                </div>
                {geoStatus === "loading" && (
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Obteniendo...</span>
                  </div>
                )}
                {geoStatus === "success" && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Ubicación obtenida</span>
                  </div>
                )}
                {geoStatus === "error" && (
                  <div className="flex items-center gap-1 text-destructive text-sm">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Error</span>
                  </div>
                )}
                {geoStatus === "idle" && (
                  <span className="text-muted-foreground text-sm">Esperando...</span>
                )}
              </div>

              {geoStatus === "success" && coordinates && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>
                    Precisión: ±{Math.round(coordinates.accuracy)}m
                  </p>
                  <p>
                    Coordenadas: {coordinates.latitude.toFixed(6)},{" "}
                    {coordinates.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              {geoStatus === "error" && (
                <div className="space-y-2">
                  <p className="text-xs text-destructive">{geoError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={requestGeolocation}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Reintentar ubicación
                  </Button>
                </div>
              )}
            </div>

            {!hasOpenCheckIn ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seleccionar Ubicación</label>
                  <Select value={locationId} onValueChange={setLocationId}>
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

                {distanceToLocation !== null && selectedLocation && (
                  <div
                    className={`rounded-lg border p-3 ${
                      isWithinRadius
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                        : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin
                        className={`h-4 w-4 ${
                          isWithinRadius ? "text-green-600" : "text-red-600"
                        }`}
                      />
                      <div className="text-sm">
                        <p className="font-medium">
                          {isWithinRadius ? (
                            <span className="text-green-700 dark:text-green-400">
                              Dentro del radio permitido
                            </span>
                          ) : (
                            <span className="text-red-700 dark:text-red-400">
                              Fuera del radio permitido
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Distancia: {Math.round(distanceToLocation)}m · Radio:{" "}
                          {selectedLocation.radius}m
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {coordinates && coordinates.accuracy > 50 && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      La precisión GPS es baja (±{Math.round(coordinates.accuracy)}m).
                      Intenta moverte a un lugar con mejor señal.
                    </p>
                  </div>
                )}

                <Button
                  className="w-full h-12 text-lg"
                  variant="default"
                  onClick={handleCheckIn}
                  disabled={
                    checkInMutation.isPending ||
                    geoStatus === "loading" ||
                    !locationId ||
                    (geoStatus === "success" && isWithinRadius === false)
                  }
                >
                  {geoStatus === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Obteniendo GPS...
                    </>
                  ) : checkInMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Procesando...
                    </>
                  ) : geoStatus !== "success" ? (
                    <>
                      <Navigation className="mr-2 h-5 w-5" />
                      Obtener Ubicación
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-5 w-5" />
                      Registrar Entrada
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                className="w-full h-12 text-lg"
                variant="destructive"
                onClick={handleCheckOut}
                disabled={checkOutMutation.isPending}
              >
                {checkOutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-5 w-5" />
                    Registrar Salida
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}
