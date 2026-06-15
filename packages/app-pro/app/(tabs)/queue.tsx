import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useEstablishment } from '../../src/contexts/EstablishmentContext';
import { queueService, QueueEntry } from '../../src/services/auth';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { colors, typography, spacing, radius } from '../../src/theme';

const STATUS_LABEL: Record<string, string> = {
    waiting: 'Aguardando',
    called: 'Chamado',
    serving: 'Atendendo',
};

export default function QueueTab() {
    const { selectedId, isLoading } = useEstablishment();
    const [items, setItems] = useState<QueueEntry[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        if (!selectedId) return;
        try {
            const { data } = await queueService.list(selectedId);
            setItems(data?.items || []);
        } catch { setItems([]); }
    }, [selectedId]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const updateStatus = async (id: string, status: string) => {
        try {
            await queueService.updateStatus(id, status);
            await load();
        } catch {
            Alert.alert('Erro', 'Não foi possível atualizar a fila.');
        }
    };

    if (isLoading) return <LoadingScreen />;

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={styles.content}
            data={items}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
            ListHeaderComponent={
                <View>
                    <Text style={styles.title}>Fila</Text>
                    <Text style={styles.sub}>
                        {items.filter((i) => i.status === 'waiting').length} aguardando
                    </Text>
                </View>
            }
            ListEmptyComponent={<Text style={styles.empty}>Fila vazia.</Text>}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.position}>#{item.position}</Text>
                        <Text style={styles.name}>{item.user_name || 'Cliente'}</Text>
                    </View>
                    {item.service_name && <Text style={styles.service}>{item.service_name}</Text>}
                    <Text style={styles.status}>{STATUS_LABEL[item.status] || item.status}</Text>
                    <View style={styles.actions}>
                        {item.status === 'waiting' && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item.id, 'called')}>
                                <Text style={styles.actionText}>Chamar</Text>
                            </TouchableOpacity>
                        )}
                        {item.status === 'called' && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item.id, 'serving')}>
                                <Text style={styles.actionText}>Atender</Text>
                            </TouchableOpacity>
                        )}
                        {item.status === 'serving' && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item.id, 'completed')}>
                                <Text style={styles.actionText}>Concluir</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, paddingTop: spacing['3xl'] },
    title: { ...typography.h2, color: colors.textMain },
    sub: { ...typography.bodySm, color: colors.textMuted, marginBottom: spacing.lg },
    empty: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center', marginTop: spacing['3xl'] },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    position: { ...typography.bodySmMedium, color: colors.textMuted },
    name: { ...typography.bodyMedium, color: colors.textMain },
    service: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
    status: { ...typography.caption, color: colors.primary, marginTop: spacing.sm },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    actionBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
    actionText: { ...typography.buttonSm, color: colors.white },
});
