import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { establishmentService, Establishment } from '../services/auth';

interface EstablishmentState {
    establishments: Establishment[];
    selectedId: string | null;
    isLoading: boolean;
    select: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
}

const EstablishmentContext = createContext<EstablishmentState>({} as EstablishmentState);

export function EstablishmentProvider({ children }: { children: React.ReactNode }) {
    const [establishments, setEstablishments] = useState<Establishment[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = async () => {
        setIsLoading(true);
        try {
            const { data } = await establishmentService.listMine();
            setEstablishments(data);
            const saved = await AsyncStorage.getItem('@dunnaa-pro:establishment');
            if (saved && data.some((e) => e.id === saved)) {
                setSelectedId(saved);
            } else if (data.length > 0) {
                setSelectedId(data[0].id);
                await AsyncStorage.setItem('@dunnaa-pro:establishment', data[0].id);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const select = async (id: string) => {
        setSelectedId(id);
        await AsyncStorage.setItem('@dunnaa-pro:establishment', id);
    };

    return (
        <EstablishmentContext.Provider value={{ establishments, selectedId, isLoading, select, refresh }}>
            {children}
        </EstablishmentContext.Provider>
    );
}

export const useEstablishment = () => useContext(EstablishmentContext);
