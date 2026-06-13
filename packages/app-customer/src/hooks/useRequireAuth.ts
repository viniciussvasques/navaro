/**
 * Redirect guests to login when auth is required for an action.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export function useRequireAuth(message?: string) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading || isAuthenticated) return;
        router.replace({
            pathname: '/(auth)/login',
            params: message ? { redirectMessage: message } : undefined,
        });
    }, [isAuthenticated, isLoading, message, router]);

    return { isAuthenticated, isLoading };
}
