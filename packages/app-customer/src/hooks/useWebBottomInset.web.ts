import { useBottomSafeInset } from './useBottomSafeInset';
import { useBrowserChromeInset } from './useBrowserChromeInset';
import { useIsStandalonePwa } from './useIsStandalonePwa';

/** Deslocamento da barra do Safari — use em `tabBarStyle.bottom`, não em padding. */
export function useSafariToolbarOffset(): number {
    const isStandalone = useIsStandalonePwa();
    const browserChrome = useBrowserChromeInset();
    if (isStandalone) return 0;
    return browserChrome;
}

/** Inset inferior para scroll (acima do menu + barra Safari). */
export function useWebBottomInset(): number {
    const bottomSafe = useBottomSafeInset();
    const isStandalone = useIsStandalonePwa();
    const safariOffset = useSafariToolbarOffset();

    if (isStandalone) {
        return bottomSafe;
    }

    return safariOffset;
}
