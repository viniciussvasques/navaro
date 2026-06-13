import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import {
    AppUpdateManifest,
    UPDATE_MANIFEST_URL,
} from '../config/updates';

export type UpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

export interface AppUpdateState {
    phase: UpdatePhase;
    manifest: AppUpdateManifest | null;
    progress: number;
    error: string | null;
    currentVersion: string;
    currentVersionCode: number;
}

function parseVersionCode(value: string | null | undefined): number {
    if (!value) return 0;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getLocalVersionCode(): number {
    const fromConfig = Constants.expoConfig?.android?.versionCode;
    if (typeof fromConfig === 'number') return fromConfig;
    return parseVersionCode(Application.nativeBuildVersion);
}

async function checkForUpdateManifest(): Promise<AppUpdateManifest | null> {
    const response = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, {
        headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as AppUpdateManifest;
}

export function useAppUpdate() {
    const [state, setState] = useState<AppUpdateState>({
        phase: 'idle',
        manifest: null,
        progress: 0,
        error: null,
        currentVersion: Application.nativeApplicationVersion ?? '0.0.0',
        currentVersionCode: getLocalVersionCode(),
    });

    const checkingRef = useRef(false);

    const checkForUpdate = useCallback(async () => {
        if (Platform.OS !== 'android' || checkingRef.current) return;
        checkingRef.current = true;

        setState((prev) => ({ ...prev, phase: 'checking', error: null }));

        try {
            const manifest = await checkForUpdateManifest();
            const localVersionCode = getLocalVersionCode();

            if (!manifest?.versionCode || manifest.versionCode <= localVersionCode) {
                setState((prev) => ({
                    ...prev,
                    phase: 'idle',
                    manifest: null,
                    currentVersionCode: localVersionCode,
                }));
                return;
            }

            setState((prev) => ({
                ...prev,
                phase: 'available',
                manifest,
                currentVersionCode: localVersionCode,
            }));
        } catch {
            setState((prev) => ({
                ...prev,
                phase: 'idle',
                error: null,
            }));
        } finally {
            checkingRef.current = false;
        }
    }, []);

    const downloadAndInstall = useCallback(async () => {
        const { manifest } = state;
        if (!manifest?.apkUrl || Platform.OS !== 'android') return;

        setState((prev) => ({ ...prev, phase: 'downloading', progress: 0, error: null }));

        try {
            const destination = `${FileSystem.cacheDirectory}dunnaa-update.apk`;
            const download = FileSystem.createDownloadResumable(
                manifest.apkUrl,
                destination,
                {},
                ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
                    if (totalBytesExpectedToWrite > 0) {
                        setState((prev) => ({
                            ...prev,
                            progress: totalBytesWritten / totalBytesExpectedToWrite,
                        }));
                    }
                },
            );

            const result = await download.downloadAsync();
            if (!result?.uri) {
                throw new Error('Download falhou');
            }

            setState((prev) => ({ ...prev, phase: 'ready', progress: 1 }));

            const installUri = await FileSystem.getContentUriAsync(result.uri);

            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: installUri,
                flags: 1,
                type: 'application/vnd.android.package-archive',
            });
        } catch (err) {
            setState((prev) => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'Não foi possível baixar a atualização',
            }));
        }
    }, [state]);

    const dismissUpdate = useCallback(() => {
        if (state.manifest?.mandatory) return;
        setState((prev) => ({ ...prev, phase: 'idle', manifest: null, error: null }));
    }, [state.manifest?.mandatory]);

    useEffect(() => {
        void checkForUpdate();

        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                void checkForUpdate();
            }
        });

        return () => subscription.remove();
    }, [checkForUpdate]);

    const visible =
        state.phase === 'available' ||
        state.phase === 'downloading' ||
        state.phase === 'ready' ||
        state.phase === 'error';

    return {
        ...state,
        visible,
        checkForUpdate,
        downloadAndInstall,
        dismissUpdate,
    };
}
