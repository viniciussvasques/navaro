/**
 * Reusable header
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBack } from '../hooks/useSafeBack';
import { colors, typography, spacing } from '../theme';

interface Props {
    title?: string;
    showBack?: boolean;
    rightAction?: React.ReactNode;
    transparent?: boolean;
}

export function Header({ title, showBack = true, rightAction, transparent = false }: Props) {
    const goBack = useSafeBack();
    const insets = useSafeAreaInsets();

    return (
        <View style={[
            styles.container,
            { paddingTop: insets.top + spacing.sm },
            transparent && styles.transparent,
        ]}>
            <View style={styles.row}>
                {showBack ? (
                    <TouchableOpacity
                        style={[styles.backBtn, transparent && styles.backBtnTransparent]}
                        onPress={goBack}
                        hitSlop={12}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chevron-back" size={26} color={transparent ? colors.white : colors.textMain} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.spacer} />
                )}

                {title && (
                    <Text style={[styles.title, transparent && styles.titleTransparent]} numberOfLines={1}>
                        {title}
                    </Text>
                )}

                <View style={styles.rightSlot}>
                    {rightAction || <View style={styles.spacer} />}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    transparent: {
        backgroundColor: 'transparent',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: colors.surface + 'CC',
        zIndex: 20,
        ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    backBtnTransparent: {
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    title: {
        ...typography.h4,
        color: colors.textMain,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: spacing.sm,
    },
    titleTransparent: {
        color: colors.white,
    },
    rightSlot: {
        width: 40,
        alignItems: 'flex-end',
    },
    spacer: {
        width: 40,
    },
});
