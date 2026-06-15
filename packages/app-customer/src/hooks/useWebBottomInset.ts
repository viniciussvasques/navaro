import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useSafariToolbarOffset(): number {
    return 0;
}

export function useWebBottomInset(): number {
    const insets = useSafeAreaInsets();
    return Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
}
