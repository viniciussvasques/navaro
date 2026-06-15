/**
 * Axios API client with auth interceptor
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type AuthEvent = 'forceLogout';
type AuthListener = () => void;

/** Event bus leve — evita import de `events` (módulo Node, indisponível no RN). */
class AuthEventBus {
    private listeners = new Map<AuthEvent, Set<AuthListener>>();

    on(event: AuthEvent, listener: AuthListener): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(listener);
    }

    off(event: AuthEvent, listener: AuthListener): void {
        this.listeners.get(event)?.delete(listener);
    }

    emit(event: AuthEvent): void {
        this.listeners.get(event)?.forEach((listener) => listener());
    }
}

function resolveApiBaseUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
    const isLocalDevUrl = !!envUrl && (
        envUrl.includes('localhost') ||
        envUrl.includes('127.0.0.1') ||
        envUrl.includes('10.0.2.2')
    );

    // Release builds nunca devem usar URL local (celular físico não alcança localhost)
    if (envUrl && !(!__DEV__ && isLocalDevUrl)) {
        return envUrl.replace(/\/$/, '');
    }
    if (!__DEV__) {
        return 'https://api.dunnaa.com.br';
    }
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8000';
    }
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:8000`;
    }
    return 'http://localhost:8000';
}

const API_BASE_URL = resolveApiBaseUrl();

// Event emitter for auth state changes
export const authEvents = new AuthEventBus();

export const api = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor — attach JWT
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('@dunnaa:token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle 401 (token expired)
let isLoggingOut = false;

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !isLoggingOut) {
            isLoggingOut = true;
            await AsyncStorage.multiRemove(['@dunnaa:token', '@dunnaa:user']);
            // Notify AuthContext to update state
            authEvents.emit('forceLogout');
            // Reset flag after a short delay
            setTimeout(() => { isLoggingOut = false; }, 2000);
        }
        return Promise.reject(error);
    }
);

export default api;
