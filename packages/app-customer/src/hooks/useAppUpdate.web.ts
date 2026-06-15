import type { AppUpdateState } from './useAppUpdate';

const idleState: AppUpdateState & {
    visible: false;
    checkForUpdate: () => Promise<void>;
    downloadAndInstall: () => Promise<void>;
    dismissUpdate: () => void;
} = {
    phase: 'idle',
    manifest: null,
    progress: 0,
    error: null,
    currentVersion: '0.0.0',
    currentVersionCode: 0,
    visible: false,
    checkForUpdate: async () => {},
    downloadAndInstall: async () => {},
    dismissUpdate: () => {},
};

/** Web: auto-update APK não se aplica ao PWA. */
export function useAppUpdate() {
    return idleState;
}
