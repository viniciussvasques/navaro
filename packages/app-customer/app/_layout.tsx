/**
 * Root layout — providers, splash screen, navigation
 */
import React, { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
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

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        void import('expo-navigation-bar').then((NavigationBar) => {
            void NavigationBar.setBackgroundColorAsync(colors.surface);
            void NavigationBar.setButtonStyleAsync('dark');
            void NavigationBar.setPositionAsync('relative');
        });
    }, []);

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
