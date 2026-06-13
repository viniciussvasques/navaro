/**
 * Review submission screen — rating + optional tip
 */
import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { reviewsService } from '../../src/services/reviews';
import { appointmentService } from '../../src/services/appointments';
import { tipsService } from '../../src/services/tips';
import { paymentsService } from '../../src/services/payments';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

const TIP_AMOUNTS = [5, 10, 20];

export default function ReviewScreen() {
    const { id: appointmentId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewDone, setReviewDone] = useState(false);
    const [selectedTip, setSelectedTip] = useState<number | null>(null);
    const [isTipping, setIsTipping] = useState(false);

    const [establishmentId, setEstablishmentId] = useState<string | null>(null);
    const [staffId, setStaffId] = useState<string | null>(null);
    const [staffName, setStaffName] = useState<string | null>(null);
    const [mpEnabled, setMpEnabled] = useState(false);

    const labels = ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];

    useEffect(() => {
        if (!appointmentId) return;
        (async () => {
            try {
                const { data } = await appointmentService.getById(appointmentId);
                setEstablishmentId(data.establishment_id);
                if (data.staff_id) setStaffId(data.staff_id);
                if (data.staff_name) setStaffName(data.staff_name);
            } catch {
                Alert.alert('Erro', 'Não foi possível carregar o agendamento.');
                router.back();
            }
        })();
        paymentsService.getConfig().then(({ data }) => setMpEnabled(!!data.mercadopago_enabled)).catch(() => {});
    }, [appointmentId]);

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Atenção', 'Selecione uma nota.');
            return;
        }
        if (!establishmentId) {
            Alert.alert('Erro', 'Dados do agendamento indisponíveis.');
            return;
        }
        setIsSubmitting(true);
        try {
            await reviewsService.create({
                appointment_id: appointmentId!,
                establishment_id: establishmentId,
                staff_id: staffId || undefined,
                rating,
                comment: comment || undefined,
            });
            if (staffId) {
                setReviewDone(true);
            } else {
                Alert.alert('Obrigado!', 'Sua avaliação foi enviada com sucesso.', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            }
        } catch {
            Alert.alert('Erro', 'Não foi possível enviar a avaliação.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const sendTipWallet = async () => {
        if (!selectedTip || !staffId) return;
        setIsTipping(true);
        try {
            await tipsService.create({
                amount: selectedTip,
                staff_id: staffId,
                appointment_id: appointmentId!,
                payment_method: 'wallet',
            });
            Alert.alert('Obrigado!', `Gorjeta de R$ ${selectedTip.toFixed(2)} enviada.`, [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            const msg = e?.response?.data?.detail?.message || e?.response?.data?.detail;
            Alert.alert('Gorjeta', typeof msg === 'string' ? msg : 'Saldo insuficiente ou erro ao enviar gorjeta.');
        } finally {
            setIsTipping(false);
        }
    };

    const sendTipPix = async () => {
        if (!selectedTip || !staffId) return;
        setIsTipping(true);
        try {
            const { data } = await tipsService.payIntent({
                amount: selectedTip,
                staff_id: staffId,
                appointment_id: appointmentId!,
            });
            router.replace({
                pathname: '/establishment/book/payment',
                params: {
                    appointmentId: appointmentId!,
                    paymentId: data.provider_payment_id,
                    qrCode: data.qr_code || '',
                    qrCodeBase64: data.qr_code_base64 || '',
                    amount: String(data.amount),
                    establishmentName: staffName || 'Profissional',
                    staffName: staffName || '',
                    date: '',
                    time: '',
                    totalDuration: '',
                    successRoute: '/(tabs)/appointments',
                    paymentType: 'tip',
                },
            });
        } catch (e: any) {
            const msg = e?.response?.data?.detail?.message || e?.response?.data?.detail;
            Alert.alert('PIX', typeof msg === 'string' ? msg : 'Erro ao gerar pagamento.');
        } finally {
            setIsTipping(false);
        }
    };

    const handleTip = (skip = false) => {
        if (skip || !selectedTip || !staffId) {
            router.back();
            return;
        }
        if (mpEnabled) {
            Alert.alert(
                'Forma de pagamento',
                `Gorjeta de R$ ${selectedTip.toFixed(2)} para ${staffName || 'profissional'}`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'PIX (Mercado Pago)', onPress: sendTipPix },
                    { text: 'Carteira', onPress: sendTipWallet },
                ]
            );
        } else {
            sendTipWallet();
        }
    };

    if (reviewDone) {
        return (
            <View style={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}>
                <Header title="Gorjeta" />
                <View style={styles.content}>
                    <Ionicons name="heart" size={56} color={colors.primary} />
                    <Text style={styles.question}>Quer deixar uma gorjeta?</Text>
                    {staffName && (
                        <Text style={styles.staffLabel}>Para {staffName}</Text>
                    )}
                    <View style={styles.tipRow}>
                        {TIP_AMOUNTS.map((amount) => (
                            <TouchableOpacity
                                key={amount}
                                style={[
                                    styles.tipBtn,
                                    selectedTip === amount && styles.tipBtnSelected,
                                ]}
                                onPress={() => setSelectedTip(amount)}
                            >
                                <Text
                                    style={[
                                        styles.tipBtnText,
                                        selectedTip === amount && styles.tipBtnTextSelected,
                                    ]}
                                >
                                    R$ {amount}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.tipHint}>
                        {mpEnabled ? 'Carteira DUNNAA ou PIX via Mercado Pago' : 'Debitado da sua carteira DUNNAA'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.submitBtn, !selectedTip && styles.submitBtnOutline]}
                        onPress={() => handleTip(false)}
                        disabled={isTipping || !selectedTip}
                        activeOpacity={0.8}
                    >
                        {isTipping ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.submitBtnText}>
                                {selectedTip ? `Enviar R$ ${selectedTip}` : 'Selecione um valor'}
                            </Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.skipBtn} onPress={() => handleTip(true)}>
                        <Text style={styles.skipBtnText}>Pular</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Header title="Avaliar Atendimento" />

            <View style={styles.content}>
                <Text style={styles.question}>Como foi sua experiência?</Text>

                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                            key={star}
                            onPress={() => setRating(star)}
                            hitSlop={8}
                        >
                            <Ionicons
                                name={star <= rating ? 'star' : 'star-outline'}
                                size={48}
                                color={star <= rating ? colors.star : colors.textLight}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {rating > 0 && <Text style={styles.ratingLabel}>{labels[rating]}</Text>}

                <TextInput
                    style={styles.commentInput}
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Conte como foi o atendimento... (opcional)"
                    placeholderTextColor={colors.textLight}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                />

                <TouchableOpacity
                    style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || rating === 0}
                    activeOpacity={0.8}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.submitBtnText}>Enviar Avaliação</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing['3xl'],
        alignItems: 'center',
    },
    question: {
        ...typography.h3,
        color: colors.textMain,
        marginBottom: spacing['2xl'],
        textAlign: 'center',
    },
    staffLabel: {
        ...typography.bodySm,
        color: colors.textMuted,
        marginBottom: spacing.xl,
    },
    starsRow: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.lg,
    },
    ratingLabel: {
        ...typography.h4,
        color: colors.primary,
        marginBottom: spacing['2xl'],
    },
    commentInput: {
        ...typography.body,
        color: colors.textMain,
        width: '100%',
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.xl,
        minHeight: 120,
        marginBottom: spacing.xl,
    },
    tipRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    tipBtn: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    tipBtnSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '15',
    },
    tipBtnText: {
        ...typography.button,
        color: colors.textMain,
    },
    tipBtnTextSelected: {
        color: colors.primary,
    },
    tipHint: {
        ...typography.caption,
        color: colors.textMuted,
        marginBottom: spacing.xl,
    },
    submitBtn: {
        width: '100%',
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        alignItems: 'center',
        ...shadow.md,
    },
    submitBtnOutline: {
        backgroundColor: colors.textLight,
    },
    submitBtnDisabled: { backgroundColor: colors.textLight },
    submitBtnText: { ...typography.button, color: colors.white },
    skipBtn: { marginTop: spacing.lg, padding: spacing.md },
    skipBtnText: { ...typography.bodySm, color: colors.textMuted },
});
