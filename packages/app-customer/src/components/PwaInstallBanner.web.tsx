import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsStandalonePwa } from '../hooks/useIsStandalonePwa';
import { useTabBarTotalHeight } from '../hooks/useTabBarPadding';
import { IosInstallGuideModal } from './IosInstallGuideModal';
import { colors, typography, spacing, radius, shadow } from '../theme';

const GUIDE_SEEN_KEY = 'dunnaa:pwa-guide-seen';

export function PwaInstallBanner() {
    const isStandalone = useIsStandalonePwa();
    const tabBarHeight = useTabBarTotalHeight();
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        if (isStandalone || Platform.OS !== 'web') return;
        try {
            if (localStorage.getItem(GUIDE_SEEN_KEY) !== '1') {
                setShowGuide(true);
            }
        } catch {
            setShowGuide(true);
        }
    }, [isStandalone]);

    const closeGuide = () => {
        setShowGuide(false);
        try {
            localStorage.setItem(GUIDE_SEEN_KEY, '1');
        } catch {
            // ignore
        }
    };

    if (isStandalone) return null;

    const fabBottom = tabBarHeight + 12;

    return (
        <>
            <View pointerEvents="box-none" style={[styles.fabWrap, { bottom: fabBottom }]}>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setShowGuide(true)}
                    activeOpacity={0.9}
                >
                    <Ionicons name="share-outline" size={18} color={colors.white} />
                    <Text style={styles.fabText}>Como instalar no iPhone</Text>
                </TouchableOpacity>
            </View>

            <IosInstallGuideModal visible={showGuide} onClose={closeGuide} />
        </>
    );
}

const styles = StyleSheet.create({
    fabWrap: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        zIndex: 60,
        alignItems: 'center',
    },
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        borderWidth: 2,
        borderColor: colors.accent,
        ...shadow.lg,
        ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
    },
    fabText: {
        ...typography.buttonSm,
        color: colors.white,
    },
});
