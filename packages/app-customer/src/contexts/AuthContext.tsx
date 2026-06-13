/**
 * Authentication context — manages user session
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, LoginResponse } from '../services/auth';
import { authEvents } from '../services/api';

interface User {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string;
    referral_code: string | null;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasSeenOnboarding: boolean;
    login: (phone: string, code: string, email?: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

    // Restore session on mount
    useEffect(() => {
        (async () => {
            try {
                const [savedToken, savedUser, onboarding] = await AsyncStorage.multiGet([
                    '@dunnaa:token',
                    '@dunnaa:user',
                    '@dunnaa:onboarding',
                ]);
                if (savedToken[1]) setToken(savedToken[1]);
                if (savedUser[1]) setUser(JSON.parse(savedUser[1]));
                if (onboarding[1] === 'done') setHasSeenOnboarding(true);
            } catch {
                // ignore
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // Listen for forced logout (401 from API interceptor)
    useEffect(() => {
        const handleForceLogout = () => {
            setToken(null);
            setUser(null);
        };
        authEvents.on('forceLogout', handleForceLogout);
        return () => { authEvents.off('forceLogout', handleForceLogout); };
    }, []);

    const login = useCallback(async (phone: string, code: string, email?: string, name?: string) => {
        const { data } = await authService.verifyOTP(phone, code, email, name);
        setToken(data.tokens.access_token);
        setUser(data.user);
        await AsyncStorage.multiSet([
            ['@dunnaa:token', data.tokens.access_token],
            ['@dunnaa:user', JSON.stringify(data.user)],
        ]);
    }, []);

    const logout = useCallback(async () => {
        setToken(null);
        setUser(null);
        await AsyncStorage.multiRemove(['@dunnaa:token', '@dunnaa:user']);
    }, []);

    const refreshUser = useCallback(async () => {
        const { data } = await authService.getProfile();
        setUser(data);
        await AsyncStorage.setItem('@dunnaa:user', JSON.stringify(data));
    }, []);

    const completeOnboarding = useCallback(async () => {
        setHasSeenOnboarding(true);
        await AsyncStorage.setItem('@dunnaa:onboarding', 'done');
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token,
                isLoading,
                hasSeenOnboarding,
                login,
                logout,
                refreshUser,
                completeOnboarding,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
