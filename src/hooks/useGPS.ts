import { useState, useCallback } from "react";
import type { GPSCoordinates } from "@/lib/types";

export const useGPS = () => {
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<GPSCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captureLocation =
    useCallback(async (): Promise<GPSCoordinates | null> => {
      if (!navigator.geolocation) {
        const errorMsg = "Geolocation is not supported by your browser";
        setError(errorMsg);
        return null;
      }

      setLoading(true);
      setError(null);

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords: GPSCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            };
            setCoordinates(coords);
            setLoading(false);
            setError(null);
            resolve(coords);
          },
          (error) => {
            let errorMsg = "Unable to retrieve your location";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMsg =
                  "Location permission denied. Please enable location access.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMsg = "Location information unavailable";
                break;
              case error.TIMEOUT:
                errorMsg = "Location request timed out";
                break;
            }
            setError(errorMsg);
            setLoading(false);
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });
    }, []);

  return {
    captureLocation,
    coordinates,
    loading,
    error,
  };
};
