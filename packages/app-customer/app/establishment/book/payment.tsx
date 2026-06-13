/**
 * PIX Payment screen — shows QR code and polls for completion
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Header } from '../../../src/components/Header';
import api from '../../../src/services/api';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme';

export default function PaymentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        appointmentId: string;
        paymentId: string;
        qrCode: string;
        qrCodeBase64: string;
        amount: string;
        establishmentName: string;
        staffName: string;
        date: string;
        time: string;
        totalDuration: string;
        successRoute?: string;
        paymentType?: string;
    }>();

    const [status, setStatus] = useState<'pending' | 'succeeded' | 'failed'>('pending');
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Poll payment status
    const checkStatus = useCallback(async () => {
        if (!params.paymentId) return;
        try {
            const { data } = await api.get(`/payments/status/${params.paymentId}`);
            if (data.status === 'succeeded') {
                setStatus('succeeded');
                // Stop polling
                if (pollingRef.current) clearInterval(pollingRef.current);
                if (timerRef.current) clearInterval(timerRef.current);

                // Navigate to receipt after a short delay
                setTimeout(() => {
                    if (params.successRoute) {
                        router.replace(params.successRoute as any);
                        return;
                    }
                    router.replace({
                        pathname: '/establishment/book/receipt',
                        params: {
                            appointmentId: params.appointmentId,
                            establishmentName: params.establishmentName,
                            staffName: params.staffName,
                            date: params.date,
                            time: params.time,
                            totalPrice: params.amount,
                            totalDuration: params.totalDuration,
                            paymentMethod: 'pix',
                        },
                    });
                }, 2000);
            } else if (data.status === 'failed') {
                setStatus('failed');
                if (pollingRef.current) clearInterval(pollingRef.current);
            }
        } catch {
            // Silent
        }
    }, [params.paymentId]);

    useEffect(() => {
        // Start polling every 3 seconds
        pollingRef.current = setInterval(checkStatus, 3000);

        // Countdown timer
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    if (timerRef.current) clearInterval(timerRef.current);
                    setStatus('failed');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [checkStatus]);

    const copyPixCode = async () => {
        if (params.qrCode) {
            try {
                await Clipboard.setStringAsync(params.qrCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
            } catch {
                Alert.alert('Erro', 'Nao foi possivel copiar o codigo.');
            }
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const amount = Number(params.amount) || 0;

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
            <Header title="Pagamento PIX" />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {status === 'succeeded' ? (
                    <View style={styles.successCard}>
                        <View style={styles.successIcon}>
                            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                        </View>
                        <Text style={styles.successTitle}>
                            {params.paymentType === 'subscription'
                                ? 'Assinatura confirmada!'
                                : params.paymentType === 'tip'
                                    ? 'Gorjeta enviada!'
                                    : 'Pagamento confirmado!'}
                        </Text>
                        <Text style={styles.successSub}>
                            {params.paymentType === 'subscription'
                                ? 'Seu plano foi ativado. Redirecionando...'
                                : params.paymentType === 'tip'
                                    ? 'Obrigado pela gorjeta! Redirecionando...'
                                    : 'Seu agendamento está confirmado. Redirecionando...'}
                        </Text>
                        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
                    </View>
                ) : status === 'failed' ? (
                    <View style={styles.failedCard}>
                        <Ionicons name="close-circle" size={64} color="#EF4444" />
                        <Text style={styles.failedTitle}>Pagamento expirado</Text>
                        <Text style={styles.failedSub}>
                            O tempo para pagamento expirou. Seu agendamento foi criado mas o pagamento ficou pendente. Voce pode pagar no local.
                        </Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => router.replace('/(tabs)/appointments')}
                        >
                            <Text style={styles.retryBtnText}>Ver meus agendamentos</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Amount */}
                        <View style={styles.amountCard}>
                            <Text style={styles.amountLabel}>Valor a pagar</Text>
                            <Text style={styles.amountValue}>R$ {amount.toFixed(2)}</Text>
                            <Text style={styles.amountSub}>{params.establishmentName}</Text>
                        </View>

                        {/* Timer */}
                        <View style={styles.timerRow}>
                            <Ionicons name="time-outline" size={16} color={timeLeft < 60 ? '#EF4444' : colors.textMuted} />
                            <Text style={[
                                styles.timerText,
                                timeLeft < 60 && styles.timerTextUrgent,
                            ]}>
                                Expira em {formatTime(timeLeft)}
                            </Text>
                        </View>

                        {/* QR Code */}
                        <View style={styles.qrCard}>
                            <Text style={styles.qrTitle}>Escaneie o QR Code no app do banco</Text>

                            {params.qrCodeBase64 ? (
                                <Image
                                    source={{ uri: `data:image/png;base64,${params.qrCodeBase64}` }}
                                    style={styles.qrImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={styles.qrPlaceholder}>
                                    <Ionicons name="qr-code" size={120} color={colors.border} />
                                    <Text style={styles.qrPlaceholderText}>
                                        QR Code PIX
                                    </Text>
                                </View>
                            )}

                            {/* Pix Copia e Cola */}
                            {params.qrCode ? (
                                <TouchableOpacity
                                    style={styles.copyBtn}
                                    onPress={copyPixCode}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={copied ? 'checkmark' : 'copy-outline'}
                                        size={18}
                                        color={copied ? '#10B981' : colors.primary}
                                    />
                                    <Text style={[
                                        styles.copyBtnText,
                                        copied && styles.copyBtnTextSuccess,
                                    ]}>
                                        {copied ? 'Codigo copiado!' : 'Copiar codigo PIX (Copia e Cola)'}
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* Instructions */}
                        <View style={styles.instructionsCard}>
                            <Text style={styles.instructionsTitle}>Como pagar</Text>
                            <View style={styles.instructionStep}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>1</Text>
                                </View>
                                <Text style={styles.stepText}>
                                    Abra o app do seu banco ou carteira digital
                                </Text>
                            </View>
                            <View style={styles.instructionStep}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>2</Text>
                                </View>
                                <Text style={styles.stepText}>
                                    Escolha pagar com PIX e escaneie o QR Code ou cole o codigo
                                </Text>
                            </View>
                            <View style={styles.instructionStep}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>3</Text>
                                </View>
                                <Text style={styles.stepText}>
                                    Confirme o pagamento. A tela atualiza automaticamente.
                                </Text>
                            </View>
                        </View>

                        {/* Polling indicator */}
                        <View style={styles.pollingRow}>
                            <ActivityIndicator color={colors.primary} size="small" />
                            <Text style={styles.pollingText}>Aguardando pagamento...</Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] },
    // Amount
    amountCard: {
        alignItems: 'center', backgroundColor: colors.primary + '08',
        borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg,
    },
    amountLabel: { ...typography.caption, color: colors.textMuted },
    amountValue: { fontSize: 36, fontWeight: '800', color: colors.primary, marginTop: spacing.xs },
    amountSub: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
    // Timer
    timerRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.xs, marginBottom: spacing.lg,
    },
    timerText: { ...typography.bodySm, color: colors.textMuted },
    timerTextUrgent: { color: '#EF4444', fontWeight: '700' },
    // QR
    qrCard: {
        backgroundColor: colors.background, borderRadius: radius.xl,
        padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xl,
    },
    qrTitle: { ...typography.bodySmMedium, color: colors.textMain, marginBottom: spacing.lg },
    qrImage: { width: 240, height: 240, marginBottom: spacing.lg },
    qrPlaceholder: {
        width: 240, height: 240, alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.lg,
    },
    qrPlaceholderText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
    copyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.primary + '08', borderRadius: radius.lg,
        paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
        borderWidth: 1, borderColor: colors.primary + '20',
    },
    copyBtnText: { ...typography.bodySmMedium, color: colors.primary },
    copyBtnTextSuccess: { color: '#10B981' },
    // Instructions
    instructionsCard: {
        backgroundColor: colors.background, borderRadius: radius.xl,
        padding: spacing.xl, marginBottom: spacing.xl,
    },
    instructionsTitle: { ...typography.h4, color: colors.textMain, marginBottom: spacing.lg },
    instructionStep: {
        flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md,
    },
    stepNumber: {
        width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    stepNumberText: { ...typography.caption, color: colors.white, fontWeight: '700' },
    stepText: { ...typography.bodySm, color: colors.textMuted, flex: 1 },
    // Polling
    pollingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, padding: spacing.lg,
    },
    pollingText: { ...typography.bodySm, color: colors.primary },
    // Success
    successCard: {
        alignItems: 'center', padding: spacing['3xl'], marginTop: spacing['3xl'],
    },
    successIcon: { marginBottom: spacing.lg },
    successTitle: { ...typography.h2, color: '#10B981' },
    successSub: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
    // Failed
    failedCard: {
        alignItems: 'center', padding: spacing['3xl'], marginTop: spacing['3xl'],
    },
    failedTitle: { ...typography.h2, color: '#EF4444', marginTop: spacing.lg },
    failedSub: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
    retryBtn: {
        backgroundColor: colors.primary, paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl, borderRadius: radius.lg, marginTop: spacing.xl,
    },
    retryBtnText: { ...typography.button, color: colors.white },
});
