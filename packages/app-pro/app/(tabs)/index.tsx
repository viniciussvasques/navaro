import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useEstablishment } from '../../src/contexts/EstablishmentContext';
import { appointmentService, queueService } from '../../src/services/auth';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function Dashboard() {
    const { establishments, selectedId, select, isLoading } = useEstablishment();
    const [stats, setStats] = useState({ appointments: 0, waiting: 0, serving: 0 });
    const [refreshing, setRefreshing] = useState(false);

    const loadStats = useCallback(async () => {
        if (!selectedId) return;
        try {
            const [appts, queue] = await Promise.all([
                appointmentService.listByEstablishment(selectedId),
                queueService.list(selectedId),
            ]);
            const today = new Date().toDateString();
            const todayCount = (appts.data || []).filter(
                (a) => new Date(a.scheduled_at).toDateString() === today
            ).length;
            setStats({
                appointments: todayCount,
                waiting: queue.data?.total_waiting ?? 0,
                serving: queue.data?.current_serving ?? 0,
            });
        } catch { /* ignore */ }
    }, [selectedId]);

    useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

    const onRefresh = async () => {
        setRefreshing(true);
        await loadStats();
        setRefreshing(false);
    };

    if (isLoading) return <LoadingScreen />;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Text style={styles.title}>DUNNAA Pro</Text>

            {establishments.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.estRow}>
                    {establishments.map((e) => (
                        <TouchableOpacity
                            key={e.id}
                            style={[styles.estChip, selectedId === e.id && styles.estChipActive]}
                            onPress={() => select(e.id)}
                        >
                            <Text style={[styles.estChipText, selectedId === e.id && styles.estChipTextActive]}>
                                {e.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            <View style={styles.grid}>
                <View style={styles.card}>
                    <Text style={styles.cardValue}>{stats.appointments}</Text>
                    <Text style={styles.cardLabel}>Agendamentos hoje</Text>
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardValue}>{stats.waiting}</Text>
                    <Text style={styles.cardLabel}>Na fila</Text>
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardValue}>{stats.serving}</Text>
                    <Text style={styles.cardLabel}>Atendendo</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
    title: { ...typography.h2, color: colors.textMain, marginTop: spacing['2xl'], marginBottom: spacing.xl },
    estRow: { marginBottom: spacing.lg },
    estChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    estChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    estChipText: { ...typography.bodySm, color: colors.textMuted },
    estChipTextActive: { color: colors.white },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    card: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.xl,
    },
    cardValue: { ...typography.h1, color: colors.primary },
    cardLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
