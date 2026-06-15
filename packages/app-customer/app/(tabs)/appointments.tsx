/**
 * My Appointments screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appointmentService, Appointment } from '../../src/services/appointments';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';
import { useTabBarPadding } from '../../src/hooks/useTabBarPadding';

type TabKey = 'upcoming' | 'past';

export default function Appointments() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const tabBarPadding = useTabBarPadding();
    const [tab, setTab] = useState<TabKey>('upcoming');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await appointmentService.list(
                tab === 'upcoming' ? 'pending,confirmed' : 'completed,cancelled'
            );
            setAppointments(data || []);
        } catch {
            setAppointments([]);
        } finally {
            setIsLoading(false);
        }
    }, [tab]);

    useEffect(() => { load(); }, [load]);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' });
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const statusLabel: Record<string, { text: string; color: string }> = {
        pending: { text: 'Pendente', color: colors.warning },
        confirmed: { text: 'Confirmado', color: colors.successDark },
        completed: { text: 'Concluído', color: colors.primary },
        cancelled: { text: 'Cancelado', color: colors.error },
        no_show: { text: 'Ausente', color: colors.error },
    };

    const renderItem = ({ item }: { item: Appointment }) => {
        const st = statusLabel[item.status] || statusLabel.pending;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/appointment/${item.id}`)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>{item.service_name || 'Serviço'}</Text>
                        <Text style={styles.cardSubtitle}>{item.establishment_name || 'Estabelecimento'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: st.color + '18' }]}>
                        <Text style={[styles.statusText, { color: st.color }]}>{st.text}</Text>
                    </View>
                </View>

                <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.detailText}>{formatDate(item.scheduled_at)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.detailText}>{formatTime(item.scheduled_at)}</Text>
                    </View>
                    {item.staff_name && (
                        <View style={styles.detailRow}>
                            <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                            <Text style={styles.detailText}>{item.staff_name}</Text>
                        </View>
                    )}
                </View>

                {tab === 'past' && item.status === 'completed' && (
                    <TouchableOpacity
                        style={styles.reviewBtn}
                        onPress={() => router.push(`/review/${item.id}`)}
                    >
                        <Ionicons name="star-outline" size={16} color={colors.primary} />
                        <Text style={styles.reviewBtnText}>Avaliar atendimento</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
            <Text style={styles.pageTitle}>Meus Agendamentos</Text>

            {/* Tabs */}
            <View style={styles.tabs}>
                {[
                    { key: 'upcoming' as TabKey, label: 'Próximos' },
                    { key: 'past' as TabKey, label: 'Passados' },
                ].map((t) => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tab, tab === t.key && styles.tabActive]}
                        onPress={() => setTab(t.key)}
                    >
                        <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={appointments}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={[styles.list, { paddingBottom: tabBarPadding }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} colors={[colors.primary]} />}
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon="calendar-outline"
                            title={tab === 'upcoming' ? 'Nenhum agendamento' : 'Sem histórico'}
                            subtitle={tab === 'upcoming' ? 'Agende um serviço para começar!' : 'Seus agendamentos passados aparecerão aqui.'}
                        />
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    pageTitle: { ...typography.h2, color: colors.textMain, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
    tabs: {
        flexDirection: 'row',
        marginHorizontal: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.xs,
        marginBottom: spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderRadius: radius.md,
    },
    tabActive: { backgroundColor: colors.primary },
    tabText: { ...typography.bodySmMedium, color: colors.textMuted },
    tabTextActive: { color: colors.white },
    list: { paddingHorizontal: spacing.xl },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadow.sm,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
    cardInfo: { flex: 1, marginRight: spacing.md },
    cardTitle: { ...typography.h4, color: colors.textMain },
    cardSubtitle: { ...typography.bodySm, color: colors.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
    statusText: { ...typography.captionMedium },
    cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    detailText: { ...typography.bodySm, color: colors.textMuted },
    reviewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    reviewBtnText: { ...typography.bodySmMedium, color: colors.primary },
});
