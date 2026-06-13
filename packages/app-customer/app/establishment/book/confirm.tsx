/**
 * Booking confirmation screen with payment method selection
 */
import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    StyleSheet, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../src/components/Header';
import { appointmentService } from '../../../src/services/appointments';
import { paymentsService } from '../../../src/services/payments';
import { useRequireAuth } from '../../../src/hooks/useRequireAuth';
import api from '../../../src/services/api';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme';

type PaymentOption = 'cash' | 'pix' | 'card' | 'wallet';

export default function BookingConfirmation() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isAuthenticated, isLoading: authLoading } = useRequireAuth('Faça login para confirmar o agendamento.');
    const params = useLocalSearchParams<{
        establishmentId: string;
        serviceIds: string;
        totalPrice: string;
        totalDuration: string;
        establishmentName: string;
        staffId: string;
        staffName: string;
        date: string;
        time: string;
    }>();

    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentOption>('cash');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [acceptOnline, setAcceptOnline] = useState(true);
    const [acceptCash, setAcceptCash] = useState(true);
    const [walletBalance, setWalletBalance] = useState(0);
    const [mpEnabled, setMpEnabled] = useState(true);

    const totalPrice = Number(params.totalPrice) || 0;

    // Load establishment payment config and wallet balance
    useEffect(() => {
        (async () => {
            let acceptOnlinePayment = true;

            try {
                const { data: est } = await api.get(
                    `/establishments/${params.establishmentId}`
                );
                acceptOnlinePayment = est.accept_online_payment !== false;
                setAcceptOnline(acceptOnlinePayment);
                setAcceptCash(est.accept_cash_payment !== false);

                if (acceptOnlinePayment) {
                    setPaymentMethod('pix');
                } else {
                    setPaymentMethod('cash');
                }
            } catch {
                // Use defaults
            }

            try {
                const { data: wallet } = await api.get('/payments/wallet');
                setWalletBalance(wallet.balance || 0);
            } catch {
                // No wallet or not authenticated for wallet
            }

            try {
                const { data: payCfg } = await paymentsService.getConfig();
                setMpEnabled(!!payCfg.mercadopago_enabled);
                if (!payCfg.mercadopago_enabled && acceptOnlinePayment) {
                    setPaymentMethod('cash');
                }
            } catch {
                setMpEnabled(false);
            }
        })();
    }, [params.establishmentId]);

    const formattedDate = (() => {
        const [y, m, d] = (params.date || '').split('-');
        return `${d}/${m}/${y}`;
    })();

    const handleConfirm = async () => {
        if (authLoading || !isAuthenticated) return;
        setIsSubmitting(true);
        try {
            const serviceIds = (params.serviceIds || '').split(',').filter(Boolean);
            const scheduledAt = `${params.date}T${params.time}:00`;


            // Validation: Ensure staffId is a valid UUID (not 'any')
            if (!params.staffId || params.staffId === 'any') {
                Alert.alert('Atenção', 'Por favor, volte e selecione um profissional específico.');
                setIsSubmitting(false);
                return;
            }

            // 1. Create appointment
            const { data: appointment } = await appointmentService.create({
                establishment_id: params.establishmentId!,
                staff_id: params.staffId!,
                service_id: serviceIds[0],
                service_ids: serviceIds.length > 1 ? serviceIds.slice(1) : undefined,
                scheduled_at: scheduledAt,
                payment_type: 'single',
                payment_method: (paymentMethod === 'pix' || paymentMethod === 'card') ? 'card' : paymentMethod === 'wallet' ? 'wallet' : 'cash',
                notes: notes || undefined,
            });

            // 2. Process payment based on method
            if (paymentMethod === 'pix') {
                // Create PIX payment intent
                try {
                    const { data: paymentData } = await api.post(
                        '/payments/create-intent',
                        {
                            appointment_id: appointment.id,
                            provider: 'mercadopago',
                        }
                    );

                    // Navigate to PIX payment screen
                    router.replace({
                        pathname: '/establishment/book/payment',
                        params: {
                            appointmentId: appointment.id,
                            paymentId: paymentData.provider_payment_id,
                            qrCode: paymentData.qr_code || '',
                            qrCodeBase64: paymentData.qr_code_base64 || '',
                            amount: String(paymentData.amount),
                            establishmentName: params.establishmentName,
                            staffName: params.staffName,
                            date: params.date,
                            time: params.time,
                            totalDuration: params.totalDuration,
                        },
                    });
                    return;
                } catch (e: any) {
                    const fallbackMsg = acceptCash
                        ? 'Agendamento foi criado com pagamento na hora.'
                        : 'O pagamento falhou. Entre em contato com o estabelecimento para regularizar.';

                    const msg = e?.response?.data?.detail?.message || `Erro ao criar pagamento PIX. ${fallbackMsg}`;
                    Alert.alert('Pagamento PIX', msg);
                    // Fall through to receipt
                }
            } else if (paymentMethod === 'card') {
                // Create Checkout Pro (opens in browser for card payment)
                try {
                    const { data: checkoutData } = await api.post(
                        '/payments/create-checkout',
                        { appointment_id: appointment.id }
                    );

                    const url = checkoutData.checkout_url || checkoutData.sandbox_url;
                    if (url) {
                        await Linking.openURL(url);
                        Alert.alert(
                            'Pagamento via cartão',
                            'Você será redirecionado para o Mercado Pago. Após pagar, seu agendamento será confirmado automaticamente.',
                            [{ text: 'OK', onPress: () => router.replace('/(tabs)/appointments') }]
                        );
                        return;
                    }
                } catch (e: any) {
                    const fallbackMsg = acceptCash
                        ? 'Agendamento criado com pagamento na hora.'
                        : 'O pagamento falhou. Entre em contato com o estabelecimento.';

                    const apiMsg = e?.response?.data?.detail?.message || e?.response?.data?.detail;
                    const msg = apiMsg || `Erro ao criar checkout. ${fallbackMsg}`;

                    Alert.alert('Cartão', typeof msg === 'string' ? msg : 'Erro ao processar');
                }
            } else if (paymentMethod === 'wallet') {
                // Pay with wallet
                try {
                    await api.post('/payments/pay-wallet', {
                        appointment_id: appointment.id,
                    });
                } catch (e: any) {
                    const msg =
                        e?.response?.data?.detail?.message ||
                        'Saldo insuficiente. Agendamento criado com pagamento na hora.';
                    Alert.alert('Carteira', msg);
                }
            }

            // 3. Go to receipt
            router.replace({
                pathname: '/establishment/book/receipt',
                params: {
                    appointmentId: appointment.id,
                    establishmentName: params.establishmentName,
                    staffName: params.staffName,
                    date: params.date,
                    time: params.time,
                    totalPrice: params.totalPrice,
                    totalDuration: params.totalDuration,
                    paymentMethod: paymentMethod,
                },
            });
        } catch (e) {
            Alert.alert('Erro', 'Nao foi possivel confirmar o agendamento. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const paymentOptions: { key: PaymentOption; icon: string; label: string; subtitle: string; available: boolean }[] = [
        {
            key: 'pix',
            icon: 'qr-code-outline',
            label: 'PIX',
            subtitle: 'Pague agora via Mercado Pago PIX',
            available: acceptOnline && mpEnabled,
        },
        {
            key: 'card',
            icon: 'card-outline',
            label: 'Cartao de credito/debito',
            subtitle: 'Pague via Mercado Pago (ate 3x)',
            available: acceptOnline && mpEnabled,
        },
        {
            key: 'cash',
            icon: 'cash-outline',
            label: 'Na hora',
            subtitle: 'Pague no estabelecimento (dinheiro ou cartao)',
            available: acceptCash,
        },
        {
            key: 'wallet',
            icon: 'wallet-outline',
            label: `Carteira (R$ ${walletBalance.toFixed(2)})`,
            subtitle: walletBalance >= totalPrice ? 'Saldo suficiente' : 'Saldo insuficiente',
            available: walletBalance > 0,
        },
    ];

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
            <Header title="Confirmar Agendamento" />

            {/* Steps */}
            <View style={styles.steps}>
                <View style={[styles.stepDot, styles.stepDone]} />
                <View style={[styles.stepLine, styles.lineDone]} />
                <View style={[styles.stepDot, styles.stepDone]} />
                <View style={[styles.stepLine, styles.lineDone]} />
                <View style={[styles.stepDot, styles.stepDone]} />
                <View style={[styles.stepLine, styles.lineDone]} />
                <View style={[styles.stepDot, styles.stepActive]} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Summary card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Resumo</Text>

                    <View style={styles.summaryRow}>
                        <Ionicons name="business-outline" size={18} color={colors.textMuted} />
                        <View style={styles.summaryInfo}>
                            <Text style={styles.summaryLabel}>Local</Text>
                            <Text style={styles.summaryValue}>{params.establishmentName}</Text>
                        </View>
                    </View>

                    {params.staffName && params.staffName !== '' && (
                        <View style={styles.summaryRow}>
                            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                            <View style={styles.summaryInfo}>
                                <Text style={styles.summaryLabel}>Profissional</Text>
                                <Text style={styles.summaryValue}>
                                    {params.staffId === 'any' ? 'Sem preferencia' : params.staffName}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.summaryRow}>
                        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                        <View style={styles.summaryInfo}>
                            <Text style={styles.summaryLabel}>Data e horario</Text>
                            <Text style={styles.summaryValue}>{formattedDate} as {params.time}</Text>
                        </View>
                    </View>

                    <View style={styles.summaryRow}>
                        <Ionicons name="hourglass-outline" size={18} color={colors.textMuted} />
                        <View style={styles.summaryInfo}>
                            <Text style={styles.summaryLabel}>Duracao</Text>
                            <Text style={styles.summaryValue}>{params.totalDuration} min</Text>
                        </View>
                    </View>

                    {/* Price */}
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Total</Text>
                        <Text style={styles.priceValue}>R$ {totalPrice.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Payment Selection */}
                <Text style={styles.sectionTitle}>Forma de pagamento</Text>
                <View style={styles.paymentOptions}>
                    {paymentOptions.filter(o => o.available).map((opt) => {
                        const selected = paymentMethod === opt.key;
                        const disabled = opt.key === 'wallet' && walletBalance < totalPrice;
                        return (
                            <TouchableOpacity
                                key={opt.key}
                                style={[
                                    styles.paymentOption,
                                    selected && styles.paymentOptionSelected,
                                    disabled && styles.paymentOptionDisabled,
                                ]}
                                onPress={() => !disabled && setPaymentMethod(opt.key)}
                                disabled={disabled}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.paymentIconCircle,
                                    selected && styles.paymentIconCircleSelected,
                                ]}>
                                    <Ionicons
                                        name={opt.icon as any}
                                        size={22}
                                        color={selected ? colors.white : colors.primary}
                                    />
                                </View>
                                <View style={styles.paymentOptionInfo}>
                                    <Text style={[
                                        styles.paymentOptionLabel,
                                        selected && styles.paymentOptionLabelSelected,
                                    ]}>
                                        {opt.label}
                                    </Text>
                                    <Text style={styles.paymentOptionSub}>{opt.subtitle}</Text>
                                </View>
                                <View style={[
                                    styles.radioOuter,
                                    selected && styles.radioOuterSelected,
                                ]}>
                                    {selected && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Notes */}
                <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Observacoes (opcional)</Text>
                    <TextInput
                        style={styles.notesInput}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Ex: barba estilo quadrada, corte mais curto nas laterais..."
                        placeholderTextColor={colors.textLight}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>

                {/* Cancellation policy */}
                <View style={styles.policyCard}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
                    <Text style={styles.policyText}>
                        Cancele com ate 2 horas de antecedencia sem custos. Cancelamentos em cima da hora podem gerar taxa.
                    </Text>
                </View>
            </ScrollView>

            {/* Confirm button */}
            <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirm}
                disabled={isSubmitting}
                activeOpacity={0.8}
            >
                {isSubmitting ? (
                    <ActivityIndicator color={colors.white} />
                ) : (
                    <>
                        <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                        <Text style={styles.confirmBtnText}>
                            {paymentMethod === 'pix'
                                ? `Pagar R$ ${totalPrice.toFixed(2)} via PIX`
                                : paymentMethod === 'card'
                                    ? `Pagar R$ ${totalPrice.toFixed(2)} com Cartao`
                                    : paymentMethod === 'wallet'
                                        ? `Pagar R$ ${totalPrice.toFixed(2)} com Carteira`
                                        : 'Confirmar Agendamento'}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    steps: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: spacing['3xl'], paddingVertical: spacing.lg,
    },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border },
    stepDone: { backgroundColor: colors.successDark },
    stepActive: { backgroundColor: colors.primary, width: 14, height: 14, borderRadius: 7 },
    stepLine: { width: 40, height: 2, backgroundColor: colors.border },
    lineDone: { backgroundColor: colors.successDark },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] },
    summaryCard: {
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
    },
    summaryTitle: { ...typography.h3, color: colors.textMain, marginBottom: spacing.xl },
    summaryRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg,
    },
    summaryInfo: { flex: 1 },
    summaryLabel: { ...typography.caption, color: colors.textMuted },
    summaryValue: { ...typography.bodyMedium, color: colors.textMain, marginTop: 2 },
    priceRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm,
    },
    priceLabel: { ...typography.h4, color: colors.textMain },
    priceValue: { ...typography.h2, color: colors.primary },
    // Payment
    sectionTitle: { ...typography.h4, color: colors.textMain, marginBottom: spacing.md },
    paymentOptions: { gap: spacing.sm, marginBottom: spacing.xl },
    paymentOption: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.background, borderRadius: radius.xl,
        padding: spacing.lg, borderWidth: 2, borderColor: 'transparent',
    },
    paymentOptionSelected: {
        borderColor: colors.primary, backgroundColor: colors.primary + '06',
    },
    paymentOptionDisabled: { opacity: 0.4 },
    paymentIconCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.primary + '12', alignItems: 'center', justifyContent: 'center',
    },
    paymentIconCircleSelected: { backgroundColor: colors.primary },
    paymentOptionInfo: { flex: 1 },
    paymentOptionLabel: { ...typography.bodyMedium, color: colors.textMain },
    paymentOptionLabelSelected: { color: colors.primary, fontWeight: '700' },
    paymentOptionSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    radioOuter: {
        width: 22, height: 22, borderRadius: 11, borderWidth: 2,
        borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    },
    radioOuterSelected: { borderColor: colors.primary },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
    // Notes
    notesSection: { marginBottom: spacing.xl },
    notesLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
    notesInput: {
        ...typography.bodySm, color: colors.textMain, backgroundColor: colors.background,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        padding: spacing.lg, minHeight: 80,
    },
    policyCard: {
        flexDirection: 'row', gap: spacing.sm,
        backgroundColor: colors.warningLight + '20', borderRadius: radius.lg, padding: spacing.lg,
    },
    policyText: { ...typography.caption, color: colors.textMuted, flex: 1, lineHeight: 18 },
    confirmBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
        backgroundColor: colors.primary, marginHorizontal: spacing.xl,
        paddingVertical: spacing.lg, borderRadius: radius.xl, ...shadow.md,
    },
    confirmBtnText: { ...typography.button, color: colors.white },
});
