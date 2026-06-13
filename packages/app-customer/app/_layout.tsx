/**
 * Root layout — providers, splash screen, navigation
 */
import React, { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { AuthProvider } from '../src/contexts/AuthContext';
import { LocationProvider } from '../src/contexts/LocationContext';
import { AppUpdateModal } from '../src/components/AppUpdateModal';
import { useAppUpdate } from '../src/hooks/useAppUpdate';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync();

function PushRegistration() {
    usePushNotifications();
    return null;
}

function AppUpdateChecker() {
    const update = useAppUpdate();
    return <AppUpdateModal state={update} />;
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        PlusJakartaSans_400Regular: require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
        PlusJakartaSans_500Medium: require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
        PlusJakartaSans_600SemiBold: require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
        PlusJakartaSans_700Bold: require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    });

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) {
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    useEffect(() => {
        onLayoutRootView();
    }, [onLayoutRootView]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <AuthProvider>
            <LocationProvider>
                <PushRegistration />
                <AppUpdateChecker />
                <StatusBar style="dark" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.surface },
                        animation: 'slide_from_right',
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="establishment" />
                    <Stack.Screen name="appointment" />
                    <Stack.Screen name="profile" />
                    <Stack.Screen name="scan" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
                    <Stack.Screen name="queue" />
                    <Stack.Screen name="review" />
                    <Stack.Screen name="notifications" />
                </Stack>
            </LocationProvider>
        </AuthProvider>
    );
}
