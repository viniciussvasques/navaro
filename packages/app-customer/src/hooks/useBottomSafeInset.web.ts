import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Lê env(safe-area-inset-bottom) — fallback quando o contexto ainda está em 0 no PWA iOS. */
function measureCssSafeAreaBottom(): number {
    if (typeof document === 'undefined') return 0;
    const probe = document.createElement('div');
    probe.style.cssText =
        'position:fixed;visibility:hidden;padding-bottom:constant(safe-area-inset-bottom);padding-bottom:env(safe-area-inset-bottom);';
    document.body.appendChild(probe);
    const value = parseInt(window.getComputedStyle(probe).paddingBottom, 10) || 0;
    document.body.removeChild(probe);
    return value;
}

/** Inset inferior para menu fixo no PWA instalado (iPhone home indicator). */
export function useBottomSafeInset(min = 12): number {
    const insets = useSafeAreaInsets();
    const [cssBottom, setCssBottom] = useState(0);

    useEffect(() => {
        setCssBottom(measureCssSafeAreaBottom());
        const onResize = () => setCssBottom(measureCssSafeAreaBottom());
        window.addEventListener('resize', onResize);
        window.visualViewport?.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            window.visualViewport?.removeEventListener('resize', onResize);
        };
    }, []);

    return Math.max(insets.bottom, cssBottom, min);
}
