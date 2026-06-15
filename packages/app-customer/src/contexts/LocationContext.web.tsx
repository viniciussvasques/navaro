/**
 * Geolocalização no navegador (Safari/Chrome PWA).
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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

function readPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocalização indisponível'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 120000,
        });
    });
}

async function reverseGeocode(
    latitude: number,
    longitude: number,
): Promise<{ city: string | null; state: string | null }> {
    try {
        const url = new URL('https://nominatim.openstreetmap.org/reverse');
        url.searchParams.set('lat', String(latitude));
        url.searchParams.set('lon', String(longitude));
        url.searchParams.set('format', 'json');
        url.searchParams.set('accept-language', 'pt-BR');

        const response = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) return { city: null, state: null };

        const data = await response.json();
        const address = data?.address ?? {};
        const city =
            address.city ||
            address.town ||
            address.municipality ||
            address.village ||
            address.suburb ||
            null;
        const state = address.state || null;
        return { city, state };
    } catch {
        return { city: null, state: null };
    }
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [city, setCity] = useState<string | null>(null);
    const [state, setState] = useState<string | null>(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const getLocation = useCallback(async () => {
        const position = await readPosition();
        const nextCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
        setCoords(nextCoords);
        setPermissionGranted(true);

        const place = await reverseGeocode(nextCoords.latitude, nextCoords.longitude);
        setCity(place.city);
        setState(place.state);
    }, []);

    const requestPermission = useCallback(async () => {
        setIsLoading(true);
        try {
            await getLocation();
            return true;
        } catch {
            setPermissionGranted(false);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [getLocation]);

    const refreshLocation = useCallback(async () => {
        await requestPermission();
    }, [requestPermission]);

    useEffect(() => {
        void (async () => {
            try {
                await getLocation();
            } catch {
                setPermissionGranted(false);
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
                permissionGranted: permissionGranted || coords !== null,
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
