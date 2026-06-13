/**
 * Subscriptions screen — list and manage customer plans
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { subscriptionService, Subscription } from '../../src/services/subscriptions';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

export default function SubscriptionsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await subscriptionService.list();
            setItems(Array.isArray(data) ? data : []);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCancel = (sub: Subscription) => {
        Alert.alert(
            'Cancelar assinatura',
            `Deseja cancelar o plano ${sub.plan?.name ?? ''}?`,
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await subscriptionService.cancel(sub.id);
                            await load();
                        } catch {
                            Alert.alert('Erro', 'Não foi possível cancelar a assinatura.');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Header title="Minhas assinaturas" />
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                {items.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="card-outline" size={48} color={colors.textMuted} />
                        <Text style={styles.emptyTitle}>Nenhuma assinatura ativa</Text>
                        <Text style={styles.emptyText}>
                            Assine um plano na página do estabelecimento para cortes ilimitados ou pacotes mensais.
                        </Text>
                        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/search')}>
                            <Text style={styles.primaryBtnText}>Buscar barbearias</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    items.map((sub) => (
                        <View key={sub.id} style={styles.card}>
                            <Text style={styles.planName}>{sub.plan?.name ?? 'Plano'}</Text>
                            <Text style={styles.price}>
                                R$ {Number(sub.plan?.price ?? 0).toFixed(2)}/mês
                            </Text>
                            <Text style={styles.period}>
                                Válido até {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                            </Text>
                            {sub.usage && sub.usage.length > 0 && (
                                <View style={styles.usageBox}>
                                    {sub.usage.map((u, i) => (
                                        <Text key={i} style={styles.usageText}>
                                            Uso: {u.used} de {u.limit} neste período
                                        </Text>
                                    ))}
                                </View>
                            )}
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{sub.status}</Text>
                            </View>
                            {sub.status === 'active' && (
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(sub)}>
                                    <Text style={styles.cancelBtnText}>Cancelar assinatura</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: spacing.xl, gap: spacing.lg },
    empty: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.md },
    emptyTitle: { ...typography.h3, color: colors.textMain },
    emptyText: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center' },
    primaryBtn: {
        marginTop: spacing.lg,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.xl,
    },
    primaryBtnText: { ...typography.button, color: '#fff' },
    card: {
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        padding: spacing.xl,
        ...shadow.sm,
    },
    planName: { ...typography.h3, color: colors.textMain },
    price: { ...typography.h2, color: colors.primary, marginTop: spacing.xs },
    period: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.sm },
    usageBox: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg },
    usageText: { ...typography.bodySm, color: colors.textMain },
    badge: {
        alignSelf: 'flex-start',
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.primary + '18',
        borderRadius: radius.lg,
    },
    badgeText: { ...typography.caption, color: colors.primary, fontWeight: '600', textTransform: 'capitalize' },
    cancelBtn: { marginTop: spacing.lg, alignItems: 'center' },
    cancelBtnText: { ...typography.bodySm, color: colors.error },
});
