import { useBottomSafeInset } from './useBottomSafeInset';
import { useIsStandalonePwa } from './useIsStandalonePwa';
import { useSafariToolbarOffset } from './useWebBottomInset';
import { TAB_BAR_HEIGHT, TAB_BAR_WEB_HEIGHT } from '../theme/layout';

const FAB_EXTRA = 52;
const SCROLL_EXTRA = 16;

export function useTabBarPadding(): number {
    const bottomSafe = useBottomSafeInset();
    const safariOffset = useSafariToolbarOffset();
    const isStandalone = useIsStandalonePwa();

    if (isStandalone) {
        return TAB_BAR_HEIGHT + bottomSafe + SCROLL_EXTRA;
    }

    return TAB_BAR_WEB_HEIGHT + safariOffset + SCROLL_EXTRA + FAB_EXTRA;
}

export function useTabBarTotalHeight(): number {
    const bottomSafe = useBottomSafeInset();
    const safariOffset = useSafariToolbarOffset();
    const isStandalone = useIsStandalonePwa();

    if (isStandalone) {
        return TAB_BAR_HEIGHT + bottomSafe;
    }

    return TAB_BAR_WEB_HEIGHT + safariOffset;
}

export const TAB_INNER_PAD = 10;
