/**
 * Notifications screen - integrated with API
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../src/components/Header';
import { EmptyState } from '../src/components/EmptyState';
import api from '../src/services/api';
import { colors, typography, spacing, radius, shadow } from '../src/theme';

interface Notification {
    id: string;
    type: 'appointment' | 'checkin' | 'queue' | 'system';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    data?: Record<string, any>;
}

const iconMap: Record<string, { name: string; color: string; bg: string }> = {
    appointment: { name: 'calendar', color: colors.primary, bg: colors.primary + '12' },
    checkin: { name: 'checkmark-circle', color: '#10B981', bg: '#10B98112' },
    queue: { name: 'people', color: colors.secondary, bg: colors.secondary + '12' },
    system: { name: 'information-circle', color: colors.textMuted, bg: colors.background },
};

export default function Notifications() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const { data } = await api.get('/notifications?page=1&page_size=50');
            const items = data.items || [];
            setNotifications(items);
            setUnreadCount(data.unread_count || 0);
        } catch {
            // silent
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch {
            // silent
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch {
            // silent
        }
    };

    const handleNotificationPress = (notif: Notification) => {
        if (!notif.is_read) {
            markAsRead(notif.id);
        }
        // Navigate based on notification data
        if (notif.data?.establishment_id) {
            if (notif.type === 'queue') {
                router.push(`/queue/${notif.data.establishment_id}`);
            } else {
                router.push(`/establishment/${notif.data.establishment_id}`);
            }
        }
    };

    const onRefresh = () => {
        setIsRefreshing(true);
        fetchNotifications(true);
    };

    const formatTimeAgo = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'agora';
        if (mins < 60) return `${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header
                title="Notificacoes"
                showBack
                rightAction={
                    unreadCount > 0 ? (
                        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
                            <Text style={styles.markAllText}>Marcar todas como lidas</Text>
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            {unreadCount > 0 && (
                <View style={styles.unreadBanner}>
                    <Ionicons name="notifications" size={14} color={colors.primary} />
                    <Text style={styles.unreadBannerText}>
                        {unreadCount} {unreadCount === 1 ? 'notificacao nao lida' : 'notificacoes nao lidas'}
                    </Text>
                </View>
            )}

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    renderItem={({ item }) => {
                        const cfg = iconMap[item.type] || iconMap.system;
                        return (
                            <TouchableOpacity
                                style={[styles.card, !item.is_read && styles.cardUnread]}
                                activeOpacity={0.7}
                                onPress={() => handleNotificationPress(item)}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
                                    <Ionicons name={cfg.name as any} size={22} color={cfg.color} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]}>
                                        {item.title}
                                    </Text>
                                    <Text style={styles.cardBody} numberOfLines={2}>
                                        {item.message}
                                    </Text>
                                    <Text style={styles.cardTime}>{formatTimeAgo(item.created_at)}</Text>
                                </View>
                                {!item.is_read && <View style={styles.unreadDot} />}
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <EmptyState
                            icon="notifications-outline"
                            title="Sem notificacoes"
                            subtitle="Quando houver atualizacoes sobre seus agendamentos, filas e check-ins, elas aparecerao aqui."
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['3xl'],
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markAllBtn: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    markAllText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
    },
    unreadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: spacing.xl,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.primary + '08',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.primary + '20',
    },
    unreadBannerText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        ...shadow.sm,
    },
    cardUnread: {
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        backgroundColor: colors.surface,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    cardContent: { flex: 1 },
    cardTitle: {
        ...typography.bodySmMedium,
        color: colors.textMain,
    },
    cardTitleUnread: {
        fontWeight: '700',
    },
    cardBody: {
        ...typography.bodySm,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    cardTime: {
        ...typography.caption,
        color: colors.textLight,
        marginTop: spacing.sm,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        marginTop: spacing.xs,
    },
});
