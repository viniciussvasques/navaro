import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT, getTabBarPadding } from '../theme/layout';

const TAB_INNER_PAD = 8;

export function useTabBarPadding(): number {
    const insets = useSafeAreaInsets();
    const bottom = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
    return getTabBarPadding(bottom);
}

export function useTabBarTotalHeight(): number {
    const insets = useSafeAreaInsets();
    const bottom = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
    return TAB_BAR_HEIGHT + bottom;
}

export { TAB_INNER_PAD };
