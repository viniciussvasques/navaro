import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from 'events';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function resolveApiBaseUrl(): string {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');
    }
    if (!__DEV__) return 'https://api.dunnaa.com.br';
    if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:8000`;
    }
    return 'http://localhost:8000';
}

export const authEvents = new EventEmitter();

export const api = axios.create({
    baseURL: `${resolveApiBaseUrl()}/api/v1`,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('@dunnaa-pro:token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let isLoggingOut = false;
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !isLoggingOut) {
            isLoggingOut = true;
            await AsyncStorage.multiRemove(['@dunnaa-pro:token', '@dunnaa-pro:user']);
            authEvents.emit('forceLogout');
            setTimeout(() => { isLoggingOut = false; }, 2000);
        }
        return Promise.reject(error);
    }
);

export default api;
