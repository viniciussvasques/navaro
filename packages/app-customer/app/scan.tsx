/**
 * QR Code Scanner screen
 * Scans QR codes from establishment posters and navigates to the establishment.
 * Auto-favorites the establishment.
 */
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ActivityIndicator, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../src/theme';
import { useAuth } from '../src/contexts/AuthContext';
import { useSafeBack } from '../src/hooks/useSafeBack';
import { favoritesService } from '../src/services/favorites';
import api from '../src/services/api';

export default function ScanScreen() {
    const router = useRouter();
    const goBack = useSafeBack();
    const insets = useSafeAreaInsets();
    const { isAuthenticated } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
        if (scanned || processing) return;
        setScanned(true);
        setProcessing(true);

        try {
            // Check-in QR: JWT token (três partes base64 separadas por ponto)
            const trimmed = data.trim();
            if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
                await handleCheckinQR(trimmed);
                return;
            }

            // Check if it's a Dunnaa QR code (contains /go/ in the URL)
            const goMatch = data.match(/\/go\/([^/?]+)/);
            if (goMatch) {
                const slug = goMatch[1];
                await handleDunnaaQR(slug);
                return;
            }

            // Check if it's a direct deep link (dunnaa://establishment/...)
            if (data.startsWith('dunnaa://')) {
                const estMatch = data.match(/establishment\/([^/?]+)/);
                if (estMatch) {
                    const estId = estMatch[1];
                    await autoFavoriteAndNavigate(estId);
                    return;
                }
            }

            // Unknown QR — offer to open it
            Alert.alert(
                'QR Code',
                'Este QR Code nao e de um estabelecimento Dunnaa. Deseja abrir o link?',
                [
                    { text: 'Cancelar', onPress: resetScanner },
                    {
                        text: 'Abrir',
                        onPress: () => {
                            Linking.openURL(data).catch(() => {});
                            resetScanner();
                        },
                    },
                ],
            );
        } catch (error) {
            Alert.alert('Erro', 'Nao foi possivel processar o QR Code.');
            resetScanner();
        }
    };

    const handleCheckinQR = async (qrToken: string) => {
        if (!isAuthenticated) {
            Alert.alert('Login necessário', 'Faça login para fazer check-in.');
            resetScanner();
            return;
        }
        try {
            const { data: result } = await api.post<{ success: boolean; message?: string; establishment_id?: string; queue_position?: number }>(
                '/checkins',
                { qr_token: qrToken }
            );
            Alert.alert(
                'Check-in realizado!',
                result.message || 'Aguarde ser chamado.',
                [{ text: 'OK', onPress: goBack }]
            );
            if (result.establishment_id) {
                router.replace(`/establishment/${result.establishment_id}`);
            } else {
                goBack();
            }
        } catch (e: any) {
            const detail = e?.response?.data?.detail;
            const msg = (typeof detail === 'object' && detail?.message) ? detail.message : (typeof detail === 'string' ? detail : 'Não foi possível fazer check-in.');
            Alert.alert('Check-in', msg);
            resetScanner();
        } finally {
            setProcessing(false);
        }
    };

    const handleDunnaaQR = async (slug: string) => {
        try {
            // Get establishment by slug
            const { data: est } = await api.get(`/establishments/slug/${slug}`);
            if (est?.id) {
                // Register scan on API
                api.post(`/qr/scan/${slug}`, { source: Platform.OS === 'web' ? 'pwa_scanner' : 'app_scanner' }).catch(() => {});

                await autoFavoriteAndNavigate(est.id);
            } else {
                Alert.alert('Oops', 'Estabelecimento nao encontrado.');
                resetScanner();
            }
        } catch {
            Alert.alert('Oops', 'Estabelecimento nao encontrado.');
            resetScanner();
        }
    };

    const autoFavoriteAndNavigate = async (establishmentId: string) => {
        try {
            if (isAuthenticated) {
                // Auto-favorite
                const { data: checkData } = await favoritesService.check(establishmentId);
                if (!checkData.is_favorite) {
                    await favoritesService.add(establishmentId);
                }

                // Check for today's appointment → auto check-in
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const { data: appointments } = await api.get(
                        `/appointments/my?date=${today}&establishment_id=${establishmentId}`
                    );
                    const list = Array.isArray(appointments) ? appointments : appointments?.items || [];
                    const upcoming = list.find(
                        (a: any) => a.status === 'confirmed' || a.status === 'pending'
                    );

                    if (upcoming) {
                        // Try to check-in
                        try {
                            await api.post(`/checkins/appointments/${upcoming.id}`);
                            Alert.alert(
                                'Check-in realizado!',
                                `Voce fez check-in para ${upcoming.service_name || 'seu agendamento'}. Aguarde ser chamado.`,
                                [{ text: 'OK' }]
                            );
                        } catch {
                            // Check-in endpoint may not exist or appointment not eligible
                        }
                    }
                } catch {
                    // No appointments or API error — not critical
                }
            }
        } catch {
            // Silently fail — not critical
        }

        setProcessing(false);
        // Navigate to establishment
        router.replace(`/establishment/${establishmentId}?auto_favorite=true`);
    };

    const resetScanner = () => {
        setScanned(false);
        setProcessing(false);
    };

    if (!permission) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                {/* Close Button */}
                <TouchableOpacity
                    style={[styles.closeBtn, { top: insets.top + spacing.md }]}
                    onPress={goBack}
                >
                    <Ionicons name="close" size={24} color={colors.textMain} />
                </TouchableOpacity>

                <View style={styles.permissionCard}>
                    <View style={styles.permissionIcon}>
                        <Ionicons name="camera-outline" size={48} color={colors.primary} />
                    </View>
                    <Text style={styles.permissionTitle}>Camera necessaria</Text>
                    <Text style={styles.permissionText}>
                        Precisamos da camera para escanear QR Codes de estabelecimentos.
                        {Platform.OS === 'web' ? ' Toque abaixo e permita o acesso quando o navegador pedir.' : ''}
                    </Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={() => void requestPermission()}>
                        <Text style={styles.permissionBtnText}>Permitir Camera</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Overlay */}
            <View style={[styles.overlay, { paddingTop: insets.top }]} pointerEvents="box-none">
                {/* Top bar */}
                <View style={styles.topBar} pointerEvents="box-none">
                    <TouchableOpacity
                        style={styles.closeBtnCamera}
                        onPress={goBack}
                        hitSlop={12}
                    >
                        <Ionicons name="close" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Escanear QR Code</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Scanner frame */}
                <View style={styles.scannerFrame}>
                    <View style={styles.cornerTL} />
                    <View style={styles.cornerTR} />
                    <View style={styles.cornerBL} />
                    <View style={styles.cornerBR} />
                </View>

                {/* Instructions */}
                <View style={styles.instructions}>
                    {processing ? (
                        <View style={styles.processingCard}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.processingText}>Processando...</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.instructionText}>
                                Aponte a camera para o QR Code do estabelecimento
                            </Text>
                            <Text style={styles.instructionSubtext}>
                                O estabelecimento sera adicionado aos seus favoritos automaticamente
                            </Text>
                        </>
                    )}

                    {scanned && !processing && (
                        <TouchableOpacity style={styles.scanAgainBtn} onPress={resetScanner}>
                            <Ionicons name="refresh" size={18} color={colors.white} />
                            <Text style={styles.scanAgainText}>Escanear novamente</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const FRAME_SIZE = 250;
const CORNER_SIZE = 24;
const CORNER_BORDER = 3;

const cornerBase = {
    position: 'absolute' as const,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.white,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.black,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    closeBtnCamera: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
        ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
    },
    closeBtn: {
        position: 'absolute',
        left: spacing.xl,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
        ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
        ...{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
    },
    title: {
        ...typography.h3,
        color: colors.white,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    scannerFrame: {
        width: FRAME_SIZE,
        height: FRAME_SIZE,
    },
    cornerTL: {
        ...cornerBase,
        top: 0,
        left: 0,
        borderTopWidth: CORNER_BORDER,
        borderLeftWidth: CORNER_BORDER,
        borderTopLeftRadius: 8,
    },
    cornerTR: {
        ...cornerBase,
        top: 0,
        right: 0,
        borderTopWidth: CORNER_BORDER,
        borderRightWidth: CORNER_BORDER,
        borderTopRightRadius: 8,
    },
    cornerBL: {
        ...cornerBase,
        bottom: 0,
        left: 0,
        borderBottomWidth: CORNER_BORDER,
        borderLeftWidth: CORNER_BORDER,
        borderBottomLeftRadius: 8,
    },
    cornerBR: {
        ...cornerBase,
        bottom: 0,
        right: 0,
        borderBottomWidth: CORNER_BORDER,
        borderRightWidth: CORNER_BORDER,
        borderBottomRightRadius: 8,
    },
    instructions: {
        alignItems: 'center',
        paddingHorizontal: spacing['3xl'],
        paddingBottom: spacing['3xl'],
    },
    instructionText: {
        ...typography.body,
        color: colors.white,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    instructionSubtext: {
        ...typography.bodySm,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    processingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
    },
    processingText: {
        ...typography.bodyMedium,
        color: colors.textMain,
    },
    scanAgainBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        marginTop: spacing.xl,
    },
    scanAgainText: {
        ...typography.buttonSm,
        color: colors.white,
    },
    permissionCard: {
        alignItems: 'center',
        paddingHorizontal: spacing['3xl'],
        maxWidth: 320,
    },
    permissionIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    permissionTitle: {
        ...typography.h3,
        color: colors.textMain,
        marginBottom: spacing.sm,
    },
    permissionText: {
        ...typography.body,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    permissionBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing['3xl'],
        paddingVertical: spacing.lg,
        borderRadius: radius.lg,
    },
    permissionBtnText: {
        ...typography.button,
        color: colors.white,
    },
});
