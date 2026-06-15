import React, { useCallback, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, RefreshControl,
    TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEstablishment } from '../../src/contexts/EstablishmentContext';
import { appointmentService, Appointment } from '../../src/services/auth';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { colors, typography, spacing, radius } from '../../src/theme';

const STATUS: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    no_show: 'Não compareceu',
    checked_in: 'Check-in',
    in_progress: 'Em atendimento',
};

const DAY_FILTERS = [
    { key: 'today', label: 'Hoje' },
    { key: 'tomorrow', label: 'Amanhã' },
    { key: 'week', label: '7 dias' },
    { key: 'all', label: 'Todos' },
] as const;

type DayFilter = (typeof DAY_FILTERS)[number]['key'];

function filterByDay(items: Appointment[], filter: DayFilter): Appointment[] {
    if (filter === 'all') return items;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    let end = new Date(start);
    if (filter === 'today') {
        end.setDate(end.getDate() + 1);
    } else if (filter === 'tomorrow') {
        start.setDate(start.getDate() + 1);
        end.setDate(start.getDate() + 1);
    } else {
        end.setDate(end.getDate() + 7);
    }
    return items.filter((a) => {
        const d = new Date(a.scheduled_at);
        return d >= start && d < end;
    });
}

export default function AppointmentsTab() {
    const { selectedId, isLoading } = useEstablishment();
    const [items, setItems] = useState<Appointment[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [dayFilter, setDayFilter] = useState<DayFilter>('today');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!selectedId) return;
        try {
            const { data } = await appointmentService.listByEstablishment(selectedId);
            const sorted = [...(data || [])].sort(
                (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
            );
            setItems(sorted);
        } catch {
            setItems([]);
        }
    }, [selectedId]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const filtered = useMemo(() => filterByDay(items, dayFilter), [items, dayFilter]);

    const changeStatus = async (id: string, status: string, label: string) => {
        Alert.alert('Confirmar', `Marcar como "${label}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sim',
                onPress: async () => {
                    setUpdatingId(id);
                    try {
                        await appointmentService.updateStatus(id, status);
                        await load();
                    } catch {
                        Alert.alert('Erro', 'Não foi possível atualizar.');
                    } finally {
                        setUpdatingId(null);
                    }
                },
            },
        ]);
    };

    if (isLoading) return <LoadingScreen />;

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={styles.content}
            data={filtered}
            keyExtractor={(item) => item.id}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={async () => {
                        setRefreshing(true);
                        await load();
                        setRefreshing(false);
                    }}
                />
            }
            ListHeaderComponent={
                <>
                    <Text style={styles.title}>Agenda</Text>
                    <View style={styles.filters}>
                        {DAY_FILTERS.map((f) => (
                            <TouchableOpacity
                                key={f.key}
                                style={[styles.filterChip, dayFilter === f.key && styles.filterChipActive]}
                                onPress={() => setDayFilter(f.key)}
                            >
                                <Text style={[styles.filterText, dayFilter === f.key && styles.filterTextActive]}>
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            }
            ListEmptyComponent={<Text style={styles.empty}>Nenhum agendamento neste período.</Text>}
            renderItem={({ item }) => {
                const canComplete = ['confirmed', 'checked_in', 'in_progress', 'pending'].includes(item.status);
                const canCancel = !['completed', 'cancelled', 'no_show'].includes(item.status);
                return (
                    <View style={styles.card}>
                        <Text style={styles.time}>
                            {new Date(item.scheduled_at).toLocaleString('pt-BR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </Text>
                        <Text style={styles.client}>{item.user_name || 'Cliente'}</Text>
                        <Text style={styles.service}>
                            {item.service_name || 'Serviço'}
                            {item.staff_name ? ` · ${item.staff_name}` : ''}
                        </Text>
                        <Text style={styles.status}>{STATUS[item.status] || item.status}</Text>

                        {(canComplete || canCancel) && (
                            <View style={styles.actions}>
                                {canComplete && (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.completeBtn]}
                                        disabled={updatingId === item.id}
                                        onPress={() => changeStatus(item.id, 'completed', 'Concluído')}
                                    >
                                        {updatingId === item.id ? (
                                            <ActivityIndicator size="small" color={colors.white} />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
                                                <Text style={styles.actionText}>Concluir</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}
                                {canCancel && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.noShowBtn]}
                                            onPress={() => changeStatus(item.id, 'no_show', 'Não compareceu')}
                                        >
                                            <Text style={styles.actionTextDark}>Faltou</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.cancelBtn]}
                                            onPress={() => changeStatus(item.id, 'cancelled', 'Cancelado')}
                                        >
                                            <Text style={styles.actionTextDark}>Cancelar</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, paddingTop: spacing['3xl'], paddingBottom: spacing['3xl'] },
    title: { ...typography.h2, color: colors.textMain, marginBottom: spacing.md },
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    filterChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...typography.caption, color: colors.textMuted },
    filterTextActive: { color: colors.white, fontWeight: '600' },
    empty: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center', marginTop: spacing['3xl'] },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
    },
    time: { ...typography.bodySmMedium, color: colors.primary },
    client: { ...typography.bodyMedium, color: colors.textMain, marginTop: spacing.xs },
    service: { ...typography.bodySm, color: colors.textMuted },
    status: { ...typography.caption, color: colors.textLight, marginTop: spacing.sm },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
    },
    completeBtn: { backgroundColor: colors.success },
    noShowBtn: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.warning },
    cancelBtn: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.error },
    actionText: { ...typography.captionMedium, color: colors.white },
    actionTextDark: { ...typography.captionMedium, color: colors.textMain },
});
