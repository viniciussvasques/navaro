/**
 * DUNNAA Pro — notifications inbox
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../src/services/api';
import { colors, typography, spacing, radius } from '../../src/theme';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get('/notifications');
            setItems(data.items || []);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const markAllRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            load();
        } catch {
            /* ignore */
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Notificações</Text>
                {items.some((n) => !n.is_read) && (
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={styles.markAll}>Marcar todas</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
                }
                contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="notifications-off-outline" size={48} color={colors.textLight} />
                        <Text style={styles.emptyText}>Nenhuma notificação</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={[styles.card, !item.is_read && styles.unread]}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardMessage}>{item.message}</Text>
                        <Text style={styles.cardDate}>
                            {new Date(item.created_at).toLocaleString('pt-BR')}
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.lg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: { ...typography.h2, color: colors.textMain },
    markAll: { ...typography.bodySm, color: colors.primary },
    emptyContainer: { flex: 1, justifyContent: 'center' },
    empty: { alignItems: 'center', gap: spacing.md },
    emptyText: { ...typography.body, color: colors.textMuted },
    card: {
        backgroundColor: colors.background, borderRadius: radius.lg,
        padding: spacing.lg, marginBottom: spacing.sm,
    },
    unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
    cardTitle: { ...typography.bodyMedium, color: colors.textMain },
    cardMessage: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
    cardDate: { ...typography.caption, color: colors.textLight, marginTop: spacing.sm },
});
