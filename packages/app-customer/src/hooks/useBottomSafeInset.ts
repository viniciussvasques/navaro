import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Inset inferior (home indicator / gesture bar). */
export function useBottomSafeInset(min = 0): number {
    const insets = useSafeAreaInsets();
    const floor = Platform.OS === 'android' ? min : 0;
    return Math.max(insets.bottom, floor);
}
