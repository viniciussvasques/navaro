import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useIsStandalonePwa } from '../hooks/useIsStandalonePwa';
import { IosInstallGuideModal } from './IosInstallGuideModal';

const DISMISS_KEY = 'dunnaa:ios-install-dismissed';

export function IosInstallModal() {
    const params = useGlobalSearchParams<{ install?: string }>();
    const router = useRouter();
    const isStandalone = useIsStandalonePwa();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (Platform.OS !== 'web' || isStandalone) return;
        if (params.install !== 'ios') return;

        try {
            if (localStorage.getItem(DISMISS_KEY) === '1') return;
        } catch {
            // ignore
        }
        setVisible(true);
    }, [params.install, isStandalone]);

    const dismiss = () => {
        setVisible(false);
        try {
            localStorage.setItem(DISMISS_KEY, '1');
            localStorage.setItem('dunnaa:pwa-guide-seen', '1');
        } catch {
            // ignore
        }
        router.replace('/(tabs)');
    };

    return <IosInstallGuideModal visible={visible} onClose={dismiss} />;
}
