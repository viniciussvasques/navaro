import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, shadow } from '../theme';

type Props = {
    visible: boolean;
    onClose: () => void;
};

export function IosInstallGuideModal({ visible, onClose }: Props) {
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View
                style={[
                    styles.backdrop,
                    {
                        paddingTop: insets.top + spacing.md,
                        paddingBottom: insets.bottom + spacing.lg,
                    },
                ]}
            >
                <View style={styles.card}>
                    <Text style={styles.title}>Instalar DUNNAA no iPhone</Text>
                    <Text style={styles.subtitle}>
                        Siga os passos abaixo para colocar o app na Tela de Início — sem barra do Safari.
                    </Text>

                    <View style={styles.steps}>
                        <View style={styles.stepRow}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepBadgeText}>1</Text>
                            </View>
                            <View style={styles.stepCopy}>
                                <Text style={styles.stepTitle}>Toque em Compartilhar</Text>
                                <Text style={styles.stepDesc}>
                                    Ícone na barra inferior do Safari (seta para cima).
                                </Text>
                            </View>
                            <Ionicons name="share-outline" size={26} color={colors.primary} />
                        </View>

                        <View style={styles.stepRow}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepBadgeText}>2</Text>
                            </View>
                            <View style={styles.stepCopy}>
                                <Text style={styles.stepTitle}>Adicionar à Tela de Início</Text>
                                <Text style={styles.stepDesc}>Role o menu e toque nesta opção.</Text>
                            </View>
                            <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
                        </View>

                        <View style={styles.stepRow}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepBadgeText}>3</Text>
                            </View>
                            <View style={styles.stepCopy}>
                                <Text style={styles.stepTitle}>Toque em Adicionar</Text>
                                <Text style={styles.stepDesc}>Abra depois pelo ícone DUNNAA na home.</Text>
                            </View>
                            <Ionicons name="checkmark-circle-outline" size={26} color={colors.successDark} />
                        </View>
                    </View>

                    <View style={styles.safariMock}>
                        <Text style={styles.mockLabel}>Onde fica no Safari:</Text>
                        <View style={styles.safariBar}>
                            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                            <View style={styles.urlPill}>
                                <Text style={styles.urlText} numberOfLines={1}>
                                    dunnaa.com.br
                                </Text>
                            </View>
                            <View style={styles.shareHighlight}>
                                <Ionicons name="share-outline" size={22} color={colors.white} />
                            </View>
                        </View>
                        <View style={styles.arrowRow}>
                            <Ionicons name="arrow-up" size={16} color={colors.accent} />
                            <Text style={styles.arrowText}>Toque aqui para instalar</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={styles.primaryBtnText}>Entendi</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.lg,
    },
    card: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
        padding: spacing.xl,
        paddingBottom: spacing['2xl'],
        ...shadow.lg,
    },
    title: {
        ...typography.h2,
        color: colors.textMain,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.bodySm,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
        lineHeight: 20,
    },
    steps: {
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        padding: spacing.md,
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBadgeText: {
        ...typography.caption,
        color: colors.white,
        fontWeight: '700',
    },
    stepCopy: {
        flex: 1,
    },
    stepTitle: {
        ...typography.bodySmMedium,
        color: colors.textMain,
    },
    stepDesc: {
        ...typography.caption,
        color: colors.textMuted,
        marginTop: 2,
    },
    safariMock: {
        backgroundColor: colors.primaryDark,
        borderRadius: radius.xl,
        padding: spacing.md,
        marginBottom: spacing.xl,
    },
    mockLabel: {
        ...typography.caption,
        color: colors.accent,
        marginBottom: spacing.sm,
        fontWeight: '600',
    },
    safariBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
    },
    urlPill: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: radius.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
    },
    urlText: {
        ...typography.caption,
        color: colors.textMain,
        textAlign: 'center',
    },
    shareHighlight: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.accent,
    },
    arrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: spacing.xs,
        marginTop: spacing.sm,
        paddingRight: spacing.xs,
    },
    arrowText: {
        ...typography.caption,
        color: colors.accent,
        fontWeight: '700',
    },
    primaryBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.xl,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
    },
    primaryBtnText: {
        ...typography.button,
        color: colors.white,
    },
});
