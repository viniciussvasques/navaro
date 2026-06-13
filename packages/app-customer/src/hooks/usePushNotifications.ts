/**
 * Register Expo push token with backend when user is authenticated.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

async function registerForPush(): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
    );
    return tokenData.data;
}

export function usePushNotifications() {
    const { isAuthenticated } = useAuth();
    const registered = useRef<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        (async () => {
            try {
                const token = await registerForPush();
                if (!token || token === registered.current) return;
                registered.current = token;
                await api.patch('/users/me', { device_token: token });
            } catch {
                // Push optional — ignore failures
            }
        })();
    }, [isAuthenticated]);
}
