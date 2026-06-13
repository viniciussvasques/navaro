/**
 * User Payment History screen
 */
import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import api from '../../src/services/api';
import { colors, typography, spacing, radius } from '../../src/theme';

type Payment = {
    id: string;
    amount: number;
    platform_fee: number;
    net_amount: number;
    status: string;
    purpose: string;
    created_at: string;
};

const statusMap: Record<string, { label: string; color: string; icon: string }> = {
    succeeded: { label: 'Aprovado', color: '#10B981', icon: 'checkmark-circle' },
    pending: { label: 'Pendente', color: '#F59E0B', icon: 'time' },
    processing: { label: 'Processando', color: '#3B82F6', icon: 'hourglass' },
    failed: { label: 'Falhou', color: '#EF4444', icon: 'close-circle' },
    refunded: { label: 'Reembolsado', color: '#8B5CF6', icon: 'arrow-undo-circle' },
};

export default function PaymentsScreen() {
    const insets = useSafeAreaInsets();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPayments = async () => {
        try {
            const { data } = await api.get('/payments');
            setPayments(Array.isArray(data) ? data : []);
        } catch {
            setPayments([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchPayments(); }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPayments();
    };

    const renderItem = ({ item }: { item: Payment }) => {
        const s = statusMap[item.status] || statusMap.pending;
        return (
            <View style={styles.card}>
                <View style={styles.cardLeft}>
                    <Ionicons name={s.icon as any} size={28} color={s.color} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>
                        {item.purpose === 'single' ? 'Agendamento' : item.purpose || 'Pagamento'}
                    </Text>
                    <Text style={styles.cardDate}>
                        {new Date(item.created_at).toLocaleDateString('pt-BR')} as{' '}
                        {new Date(item.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit', minute: '2-digit',
                        })}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: s.color + '15' }]}>
                        <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                    </View>
                </View>
                <Text style={styles.cardAmount}>R$ {Number(item.amount).toFixed(2)}</Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Header title="Meus Pagamentos" />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={payments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="card-outline" size={64} color={colors.border} />
                            <Text style={styles.emptyText}>
                                Nenhum pagamento realizado ainda.
                            </Text>
                            <Text style={styles.emptySubText}>
                                Ao pagar um agendamento pelo app, ele aparecera aqui.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] },
    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.background, borderRadius: radius.xl,
        padding: spacing.lg, marginBottom: spacing.md,
    },
    cardLeft: { marginRight: spacing.md },
    cardInfo: { flex: 1 },
    cardTitle: { ...typography.bodyMedium, color: colors.textMain },
    cardDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    statusBadge: {
        alignSelf: 'flex-start', borderRadius: radius.sm,
        paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: spacing.xs,
    },
    statusText: { ...typography.caption, fontWeight: '600', fontSize: 10 },
    cardAmount: { ...typography.h4, color: colors.textMain },
    empty: { alignItems: 'center', paddingTop: spacing['4xl'] },
    emptyText: { ...typography.bodyMedium, color: colors.textMuted, marginTop: spacing.lg },
    emptySubText: { ...typography.caption, color: colors.textLight, textAlign: 'center', marginTop: spacing.sm },
});
