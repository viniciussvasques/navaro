import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';

/** Volta uma tela ou cai no fallback (ex.: modal aberto sem histórico no PWA). */
export function useSafeBack(fallbackHref = '/(tabs)' as const) {
    const router = useRouter();
    const navigation = useNavigation();

    return useCallback(() => {
        if (navigation.canGoBack()) {
            router.back();
            return;
        }
        router.replace(fallbackHref);
    }, [navigation, router, fallbackHref]);
}
