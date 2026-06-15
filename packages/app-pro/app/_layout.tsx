import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../src/contexts/AuthContext';
import { EstablishmentProvider } from '../src/contexts/EstablishmentContext';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    useEffect(() => { SplashScreen.hideAsync(); }, []);

    return (
        <AuthProvider>
            <EstablishmentProvider>
                <StatusBar style="dark" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.surface },
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="services" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="staff" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="promotions" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
                </Stack>
            </EstablishmentProvider>
        </AuthProvider>
    );
}
