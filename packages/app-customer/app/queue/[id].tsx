/**
 * Queue status screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Header } from '../../src/components/Header';
import { queueService, QueueEntry } from '../../src/services/queue';
import { useLocation } from '../../src/contexts/LocationContext';
import { useRequireAuth } from '../../src/hooks/useRequireAuth';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

export default function QueueScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { coords, permissionGranted, requestPermission, refreshLocation } = useLocation();
    const { isAuthenticated, isLoading: authLoading } = useRequireAuth();

    const [entry, setEntry] = useState<QueueEntry | null>(null);
    const [queueInfo, setQueueInfo] = useState<{ total_waiting: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);

    const loadQueueState = useCallback(async () => {
        if (!id) return;
        try {
            const [myRes, publicRes] = await Promise.all([
                queueService.getMyQueues(),
                queueService.getEstablishmentQueue(id),
            ]);
            const active = (myRes.data || []).find((e) => e.establishment_id === id);
            setEntry(active ?? null);
            setQueueInfo({ total_waiting: publicRes.data?.total_waiting ?? 0 });
        } catch {
            setEntry(null);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadQueueState();
    }, [loadQueueState]);

    const loadStatus = useCallback(async () => {
        if (!entry?.id) return;
        try {
            const { data } = await queueService.getStatus(entry.id);
            setEntry(data);
        } catch { /* ignore */ }
    }, [entry?.id]);

    useEffect(() => {
        if (!entry?.id) return;
        const interval = setInterval(loadStatus, 15000);
        return () => clearInterval(interval);
    }, [entry?.id, loadStatus]);

    const handleJoin = async () => {
        if (!id || authLoading || !isAuthenticated) return;
        setIsJoining(true);
        try {
            if (!permissionGranted) {
                const granted = await requestPermission();
                if (!granted) {
                    Alert.alert('Localização', 'Ative a localização para entrar na fila virtual.');
                    return;
                }
            }
            await refreshLocation();
            let lat = coords?.latitude;
            let lng = coords?.longitude;
            if (lat == null || lng == null) {
                const pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            }
            const { data: queueEntry } = await queueService.join(id, {
                latitude: lat,
                longitude: lng,
            });
            setEntry(queueEntry);
            await loadQueueState();
        } catch (e: any) {
            const msg =
                e?.response?.data?.detail?.message ||
                e?.response?.data?.detail ||
                'Não foi possível entrar na fila.';
            Alert.alert('Erro', typeof msg === 'string' ? msg : 'Não foi possível entrar na fila.');
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = () => {
        Alert.alert('Sair da fila', 'Deseja realmente sair da fila?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await queueService.leave(entry!.id);
                        setEntry(null);
                        await loadQueueState();
                    } catch {
                        Alert.alert('Erro', 'Não foi possível sair da fila.');
                    }
                },
            },
        ]);
    };

    const statusLabel: Record<string, string> = {
        waiting: 'Aguardando',
        called: 'Chamado — aproxime-se!',
        serving: 'Em atendimento',
        completed: 'Concluído',
        cancelled: 'Cancelado',
        left: 'Saiu da fila',
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Header title="Fila virtual" />
            <View style={styles.content}>
                {!entry ? (
                    <>
                        <View style={styles.card}>
                            <Ionicons name="people-outline" size={48} color={colors.primary} />
                            <Text style={styles.title}>Entrar na fila</Text>
                            <Text style={styles.subtitle}>
                                {queueInfo?.total_waiting ?? 0} pessoa(s) aguardando agora
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={handleJoin}
                            disabled={isJoining}
                        >
                            {isJoining ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Entrar na fila</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.position}>#{entry.position}</Text>
                            <Text style={styles.title}>{statusLabel[entry.status] ?? entry.status}</Text>
                            {entry.estimated_wait_minutes != null && entry.status === 'waiting' && (
                                <Text style={styles.subtitle}>
                                    Tempo estimado: ~{entry.estimated_wait_minutes} min
                                </Text>
                            )}
                            {entry.people_ahead != null && entry.status === 'waiting' && (
                                <Text style={styles.subtitle}>
                                    {entry.people_ahead} pessoa(s) na sua frente
                                </Text>
                            )}
                        </View>
                        {['waiting', 'called'].includes(entry.status) && (
                            <TouchableOpacity style={styles.dangerBtn} onPress={handleLeave}>
                                <Text style={styles.dangerBtnText}>Sair da fila</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
                    <Text style={styles.secondaryBtnText}>Voltar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, padding: spacing.xl, gap: spacing.lg },
    card: {
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        padding: spacing['2xl'],
        alignItems: 'center',
        ...shadow.sm,
    },
    position: { ...typography.h1, color: colors.primary, marginBottom: spacing.sm },
    title: { ...typography.h3, color: colors.textMain, textAlign: 'center' },
    subtitle: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
    primaryBtn: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        alignItems: 'center',
    },
    primaryBtnText: { ...typography.button, color: '#fff' },
    dangerBtn: {
        borderWidth: 1,
        borderColor: colors.error,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        alignItems: 'center',
    },
    dangerBtnText: { ...typography.button, color: colors.error },
    secondaryBtn: { alignItems: 'center', paddingVertical: spacing.md },
    secondaryBtnText: { ...typography.bodySm, color: colors.textMuted },
});
