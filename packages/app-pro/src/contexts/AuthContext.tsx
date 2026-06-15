import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, LoginResponse } from '../services/auth';
import { authEvents } from '../services/api';

interface User {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    role: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (phone: string, code: string, email?: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [[, token], [, savedUser]] = await AsyncStorage.multiGet([
                    '@dunnaa-pro:token',
                    '@dunnaa-pro:user',
                ]);
                if (token && savedUser) setUser(JSON.parse(savedUser));
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        const onLogout = () => setUser(null);
        authEvents.on('forceLogout', onLogout);
        return () => { authEvents.off('forceLogout', onLogout); };
    }, []);

    const login = useCallback(async (phone: string, code: string, email?: string, name?: string) => {
        const { data } = await authService.verifyOTP(phone, code, email, name);
        if (!['owner', 'admin', 'staff'].includes(data.user.role)) {
            throw new Error('Acesso restrito a profissionais e proprietários.');
        }
        await AsyncStorage.multiSet([
            ['@dunnaa-pro:token', data.tokens.access_token],
            ['@dunnaa-pro:user', JSON.stringify(data.user)],
        ]);
        setUser(data.user);
    }, []);

    const logout = useCallback(async () => {
        await AsyncStorage.multiRemove(['@dunnaa-pro:token', '@dunnaa-pro:user']);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
