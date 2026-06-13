import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import type { AppUpdateState } from '../hooks/useAppUpdate';

interface AppUpdateModalProps {
    state: AppUpdateState & {
        visible: boolean;
        downloadAndInstall: () => Promise<void>;
        dismissUpdate: () => void;
    };
}

export function AppUpdateModal({ state }: AppUpdateModalProps) {
    const {
        visible,
        manifest,
        phase,
        progress,
        error,
        currentVersion,
        downloadAndInstall,
        dismissUpdate,
    } = state;

    if (!visible || !manifest) return null;

    const isDownloading = phase === 'downloading';
    const isReady = phase === 'ready';
    const percent = Math.round(progress * 100);

    return (
        <Modal visible transparent animationType="fade" onRequestClose={dismissUpdate}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.iconWrap}>
                        <Ionicons name="cloud-download-outline" size={32} color={colors.primary} />
                    </View>

                    <Text style={styles.title}>Nova versão disponível</Text>
                    <Text style={styles.subtitle}>
                        {currentVersion} → {manifest.version}
                    </Text>

                    {manifest.releaseNotes ? (
                        <Text style={styles.notes}>{manifest.releaseNotes}</Text>
                    ) : null}

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    {isDownloading ? (
                        <View style={styles.progressWrap}>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${percent}%` }]} />
                            </View>
                            <Text style={styles.progressText}>Baixando… {percent}%</Text>
                        </View>
                    ) : null}

                    {isReady ? (
                        <Text style={styles.hint}>
                            Confirme a instalação na tela do Android para concluir a atualização.
                        </Text>
                    ) : null}

                    <Pressable
                        style={[styles.primaryBtn, isDownloading && styles.btnDisabled]}
                        onPress={() => void downloadAndInstall()}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <ActivityIndicator color={colors.textOnPrimary} />
                        ) : (
                            <Text style={styles.primaryBtnText}>
                                {isReady ? 'Abrir instalador' : 'Atualizar agora'}
                            </Text>
                        )}
                    </Pressable>

                    {!manifest.mandatory && phase !== 'downloading' ? (
                        <Pressable style={styles.secondaryBtn} onPress={dismissUpdate}>
                            <Text style={styles.secondaryBtnText}>Depois</Text>
                        </Pressable>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: spacing.lg,
    },
    iconWrap: {
        alignSelf: 'center',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h3,
        color: colors.textMain,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.body,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    notes: {
        ...typography.bodySm,
        color: colors.textSecondary,
        marginTop: spacing.md,
        lineHeight: 20,
    },
    error: {
        ...typography.bodySm,
        color: colors.error,
        marginTop: spacing.sm,
    },
    progressWrap: {
        marginTop: spacing.md,
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.borderLight,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    progressText: {
        ...typography.caption,
        color: colors.textMuted,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    hint: {
        ...typography.bodySm,
        color: colors.textSecondary,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    primaryBtn: {
        marginTop: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    btnDisabled: {
        opacity: 0.7,
    },
    primaryBtnText: {
        ...typography.button,
        color: colors.textOnPrimary,
    },
    secondaryBtn: {
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    secondaryBtnText: {
        ...typography.body,
        color: colors.textMuted,
    },
});
