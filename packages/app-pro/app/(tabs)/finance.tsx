/**
 * DUNNAA Pro — financial summary for establishment
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../src/services/api';
import { useEstablishment } from '../../src/contexts/EstablishmentContext';
import { colors, typography, spacing, radius } from '../../src/theme';

interface FinanceSummary {
    total_revenue: number;
    pending_payouts: number;
    completed_appointments: number;
    platform_fees: number;
}

export default function FinanceScreen() {
    const insets = useSafeAreaInsets();
    const { selectedId, establishments } = useEstablishment();
    const selected = establishments.find((e) => e.id === selectedId);
    const [data, setData] = useState<FinanceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        if (!selectedId) {
            setLoading(false);
            return;
        }
        try {
            const { data: analytics } = await api.get(
                `/analytics/establishments/${selectedId}/overview`
            );
            setData({
                total_revenue: analytics.total_revenue ?? analytics.gmv ?? 0,
                pending_payouts: analytics.pending_payouts ?? 0,
                completed_appointments: analytics.completed_appointments ?? 0,
                platform_fees: analytics.platform_fees ?? 0,
            });
        } catch {
            setData(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedId]);

    useEffect(() => {
        load();
    }, [load]);

    const fmt = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    if (loading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { paddingTop: insets.top + spacing.md }]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
            }
        >
            <Text style={styles.title}>Financeiro</Text>
            {selected && (
                <Text style={styles.subtitle}>{selected.name}</Text>
            )}

            {!data ? (
                <View style={styles.empty}>
                    <Ionicons name="wallet-outline" size={48} color={colors.textLight} />
                    <Text style={styles.emptyText}>Dados indisponíveis</Text>
                </View>
            ) : (
                <View style={styles.grid}>
                    <View style={styles.card}>
                        <Ionicons name="trending-up" size={24} color={colors.successDark} />
                        <Text style={styles.cardLabel}>Receita</Text>
                        <Text style={styles.cardValue}>{fmt(data.total_revenue)}</Text>
                    </View>
                    <View style={styles.card}>
                        <Ionicons name="time-outline" size={24} color={colors.warning} />
                        <Text style={styles.cardLabel}>Repasse pendente</Text>
                        <Text style={styles.cardValue}>{fmt(data.pending_payouts)}</Text>
                    </View>
                    <View style={styles.card}>
                        <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
                        <Text style={styles.cardLabel}>Atendimentos</Text>
                        <Text style={styles.cardValue}>{data.completed_appointments}</Text>
                    </View>
                    <View style={styles.card}>
                        <Ionicons name="receipt-outline" size={24} color={colors.textMuted} />
                        <Text style={styles.cardLabel}>Taxas plataforma</Text>
                        <Text style={styles.cardValue}>{fmt(data.platform_fees)}</Text>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.lg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    title: { ...typography.h2, color: colors.textMain },
    subtitle: { ...typography.bodySm, color: colors.textMuted, marginBottom: spacing.xl },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    card: {
        width: '47%', backgroundColor: colors.background, borderRadius: radius.xl,
        padding: spacing.lg, gap: spacing.xs,
    },
    cardLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
    cardValue: { ...typography.h3, color: colors.textMain },
    empty: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.md },
    emptyText: { ...typography.body, color: colors.textMuted },
});
