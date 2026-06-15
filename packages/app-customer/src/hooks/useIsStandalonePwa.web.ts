import { Platform } from 'react-native';

/** True quando o app roda instalado (sem barra do Safari). */
export function useIsStandalonePwa(): boolean {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
        return true;
    }

    const nav = window.navigator as Navigator & { standalone?: boolean };
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        nav.standalone === true
    );
}
