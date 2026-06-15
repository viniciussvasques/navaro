/**
 * App entry point — guest mode after onboarding (login only for booking/queue/profile actions)
 */
import { Redirect, useGlobalSearchParams } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
    const { isLoading, hasSeenOnboarding } = useAuth();
    const params = useGlobalSearchParams<{ install?: string }>();
    const installQuery = params.install ? `?install=${params.install}` : '';

    if (isLoading) return <LoadingScreen />;

    if (!hasSeenOnboarding) return <Redirect href="/(auth)/onboarding" />;

    return <Redirect href={`/(tabs)${installQuery}`} />;
}
