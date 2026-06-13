/**
 * Location context — geolocation management
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';

interface LocationState {
    coords: { latitude: number; longitude: number } | null;
    city: string | null;
    state: string | null;
    permissionGranted: boolean;
    isLoading: boolean;
    requestPermission: () => Promise<boolean>;
    refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationState>({} as LocationState);

export function LocationProvider({ children }: { children: React.ReactNode }) {
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [city, setCity] = useState<string | null>(null);
    const [state, setState] = useState<string | null>(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const getLocation = useCallback(async () => {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            setCoords({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            // Reverse geocode for city name
            const [place] = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
            if (place) {
                setCity(place.city || place.subregion || null);
                setState(place.region || null);
            }
        } catch {
            // Location unavailable
        }
    }, []);

    const requestPermission = useCallback(async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === 'granted';
        setPermissionGranted(granted);
        if (granted) await getLocation();
        return granted;
    }, [getLocation]);

    const refreshLocation = useCallback(async () => {
        if (permissionGranted) await getLocation();
    }, [permissionGranted, getLocation]);

    // Check permission on mount
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                const granted = status === 'granted';
                setPermissionGranted(granted);
                if (granted) await getLocation();
            } catch {
                // ignore
            } finally {
                setIsLoading(false);
            }
        })();
    }, [getLocation]);

    return (
        <LocationContext.Provider
            value={{
                coords,
                city,
                state,
                permissionGranted,
                isLoading,
                requestPermission,
                refreshLocation,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
}

export const useLocation = () => useContext(LocationContext);
