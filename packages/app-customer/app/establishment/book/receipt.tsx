/**
 * Booking receipt / success screen
 */
import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme';

export default function BookingReceipt() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        appointmentId: string;
        establishmentName: string;
        staffName: string;
        date: string;
        time: string;
        totalPrice: string;
        totalDuration: string;
        paymentMethod: string;
    }>();

    const paymentLabel = params.paymentMethod === 'pix'
        ? 'PIX (pago)'
        : params.paymentMethod === 'wallet'
        ? 'Carteira (pago)'
        : 'No local';

    const formattedDate = (() => {
        const [y, m, d] = (params.date || '').split('-');
        return `${d}/${m}/${y}`;
    })();

    const handleShare = async () => {
        await Share.share({
            message: `Agendei no ${params.establishmentName} pelo DUNNAA!\n${formattedDate} às ${params.time}\nhttps://dunnaa.com.br`,
        });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.lg }]}>
            {/* Success icon */}
            <View style={styles.successCircle}>
                <Ionicons name="checkmark-circle" size={80} color={colors.successDark} />
            </View>

            <Text style={styles.title}>Agendamento Confirmado!</Text>
            <Text style={styles.subtitle}>
                Seu horário está reservado. Confira os detalhes abaixo.
            </Text>

            {/* Receipt card */}
            <View style={styles.receiptCard}>
                <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Local</Text>
                    <Text style={styles.receiptValue}>{params.establishmentName}</Text>
                </View>
                {params.staffName && params.staffName !== '' && (
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Profissional</Text>
                        <Text style={styles.receiptValue}>{params.staffName}</Text>
                    </View>
                )}
                <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Data</Text>
                    <Text style={styles.receiptValue}>{formattedDate}</Text>
                </View>
                <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Horário</Text>
                    <Text style={styles.receiptValue}>{params.time}</Text>
                </View>
                <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Duração</Text>
                    <Text style={styles.receiptValue}>{params.totalDuration} min</Text>
                </View>
                <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Pagamento</Text>
                    <Text style={[styles.receiptValue, params.paymentMethod !== 'cash' && { color: '#10B981' }]}>
                        {paymentLabel}
                    </Text>
                </View>
                <View style={[styles.receiptRow, styles.receiptPriceRow]}>
                    <Text style={styles.receiptPriceLabel}>Total</Text>
                    <Text style={styles.receiptPrice}>R$ {Number(params.totalPrice).toFixed(2)}</Text>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
                    <Ionicons name="share-social-outline" size={20} color={colors.primary} />
                    <Text style={styles.shareBtnText}>Compartilhar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => router.replace('/(tabs)')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.homeBtnText}>Voltar ao início</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.apptBtn}
                    onPress={() => router.replace('/(tabs)/appointments')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.apptBtnText}>Ver meus agendamentos</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
    },
    successCircle: {
        marginBottom: spacing.xl,
    },
    title: {
        ...typography.h2,
        color: colors.textMain,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.bodySm,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing['2xl'],
    },
    receiptCard: {
        width: '100%',
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing['2xl'],
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    receiptLabel: { ...typography.bodySm, color: colors.textMuted },
    receiptValue: { ...typography.bodySmMedium, color: colors.textMain },
    receiptPriceRow: { borderBottomWidth: 0, paddingTop: spacing.lg, marginTop: spacing.sm },
    receiptPriceLabel: { ...typography.h4, color: colors.textMain },
    receiptPrice: { ...typography.h2, color: colors.primary },
    actions: { width: '100%', gap: spacing.md },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    shareBtnText: { ...typography.button, color: colors.primary },
    homeBtn: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.primary,
        ...shadow.md,
    },
    homeBtnText: { ...typography.button, color: colors.white },
    apptBtn: { alignItems: 'center', paddingVertical: spacing.md },
    apptBtnText: { ...typography.bodySmMedium, color: colors.textMuted },
});
