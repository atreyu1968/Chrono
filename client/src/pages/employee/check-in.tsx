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
        title: "Check-in successful",
        description: "Your attendance has been recorded",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in failed",
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
            title: "Location Error",
            description: "Please enable location services to check in",
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
            <CardTitle>Check In/Out</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Location</label>
              <Select
                value={location}
                onValueChange={setLocation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
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
              {checkInMutation.isPending ? "Processing..." : "Check In"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}
