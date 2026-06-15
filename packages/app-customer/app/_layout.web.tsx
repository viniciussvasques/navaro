/**
 * Root layout — web/PWA (sem push, sem auto-update APK)
 */
import React, { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider } from '../src/contexts/AuthContext';
import { LocationProvider } from '../src/contexts/LocationContext';
import { SafariWebUi } from '../src/components/SafariWebUi';
import { IosInstallModal } from '../src/components/IosInstallModal';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayoutWeb() {
    const [fontsLoaded] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
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
                <SafariWebUi />
                <IosInstallModal />
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
