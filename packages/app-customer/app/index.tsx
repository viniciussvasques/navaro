/**
 * App entry point — guest mode after onboarding (login only for booking/queue/profile actions)
 */
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
    const { isLoading, hasSeenOnboarding } = useAuth();

    if (isLoading) return <LoadingScreen />;

    if (!hasSeenOnboarding) return <Redirect href="/(auth)/onboarding" />;

    return <Redirect href="/(tabs)" />;
}
