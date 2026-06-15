import React from 'react';
import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PwaInstallBanner } from '../../src/components/PwaInstallBanner';
import { SafariChromeFill } from '../../src/components/SafariChromeFill';
import { useBottomSafeInset } from '../../src/hooks/useBottomSafeInset';
import { useSafariToolbarOffset } from '../../src/hooks/useWebBottomInset';
import { useIsStandalonePwa } from '../../src/hooks/useIsStandalonePwa';
import { TAB_BAR_HEIGHT, TAB_BAR_WEB_HEIGHT } from '../../src/theme/layout';
import { colors, typography } from '../../src/theme';

const WEB_TAB_PAD = 8;

export default function TabLayout() {
    const safariOffset = useSafariToolbarOffset();
    const bottomSafe = useBottomSafeInset();
    const isStandalone = useIsStandalonePwa();
    const isSafariBrowser = Platform.OS === 'web' && !isStandalone;
    const isWebStandalone = Platform.OS === 'web' && isStandalone;

    const tabBarStyle = isSafariBrowser
        ? {
            position: 'fixed' as const,
            left: 0,
            right: 0,
            bottom: safariOffset,
            zIndex: 99,
            height: TAB_BAR_WEB_HEIGHT,
            paddingTop: WEB_TAB_PAD,
            paddingBottom: WEB_TAB_PAD,
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
            borderTopWidth: 1,
            overflow: 'visible' as const,
        }
        : isWebStandalone
          ? {
                position: 'fixed' as const,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99,
                paddingTop: WEB_TAB_PAD,
                paddingBottom: bottomSafe,
                minHeight: TAB_BAR_HEIGHT + bottomSafe,
                backgroundColor: colors.surface,
                borderTopColor: colors.borderLight,
                borderTopWidth: 1,
            }
          : {
                backgroundColor: colors.surface,
                borderTopColor: colors.borderLight,
                borderTopWidth: 1,
                paddingTop: 6,
                paddingBottom: bottomSafe,
                minHeight: TAB_BAR_HEIGHT + bottomSafe,
            };

    return (
        <View style={{ flex: 1 }}>
            <SafariChromeFill />
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.primary,
                    tabBarInactiveTintColor: colors.textLight,
                    tabBarHideOnKeyboard: true,
                    tabBarStyle,
                    tabBarItemStyle:
                        isSafariBrowser || isWebStandalone
                            ? { paddingVertical: 4, justifyContent: 'center' as const }
                            : undefined,
                    tabBarIconStyle: { marginBottom: 2 },
                    tabBarLabelStyle: {
                        ...typography.caption,
                        fontSize: 11,
                        lineHeight: 14,
                        marginTop: 2,
                        marginBottom: 0,
                    },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Início',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="home-outline" size={Math.min(size, 24)} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="search"
                    options={{
                        title: 'Buscar',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="search-outline" size={Math.min(size, 24)} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="appointments"
                    options={{
                        title: 'Agendamentos',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="calendar-outline" size={Math.min(size, 24)} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="favorites"
                    options={{
                        title: 'Favoritos',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="heart-outline" size={Math.min(size, 24)} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Perfil',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="person-outline" size={Math.min(size, 24)} color={color} />
                        ),
                    }}
                />
            </Tabs>
            <PwaInstallBanner />
        </View>
    );
}
