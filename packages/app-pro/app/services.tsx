/**
 * DUNNAA Pro — Services management (mobile)
 */
import React, { useCallback, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEstablishment } from '../src/contexts/EstablishmentContext';
import api from '../src/services/api';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { colors, typography, spacing, radius } from '../src/theme';

type Service = { id: string; name: string; price: number; duration_minutes: number; active: boolean };

export default function ServicesScreen() {
    const router = useRouter();
    const { selectedId, isLoading } = useEstablishment();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('50');
    const [duration, setDuration] = useState('30');

    const load = useCallback(async () => {
        if (!selectedId) return;
        try {
            const { data } = await api.get(`/establishments/${selectedId}/services`);
            setServices(Array.isArray(data) ? data : []);
        } catch {
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        load();
    }, [load]));

    const handleCreate = async () => {
        if (!selectedId || !name.trim()) return;
        try {
            await api.post(`/establishments/${selectedId}/services`, {
                name: name.trim(),
                price: Number(price),
                duration_minutes: Number(duration),
            });
            setName('');
            await load();
        } catch {
            Alert.alert('Erro', 'Não foi possível criar o serviço.');
        }
    };

    const toggleActive = async (svc: Service) => {
        if (!selectedId) return;
        try {
            await api.patch(`/establishments/${selectedId}/services/${svc.id}`, { active: !svc.active });
            await load();
        } catch {
            Alert.alert('Erro', 'Não foi possível atualizar.');
        }
    };

    if (isLoading) return <LoadingScreen />;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        >
            <TouchableOpacity style={styles.back} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color={colors.primary} />
                <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Serviços</Text>

            <View style={styles.form}>
                <TextInput style={styles.input} placeholder="Nome do serviço" value={name} onChangeText={setName} />
                <View style={styles.row}>
                    <TextInput style={[styles.input, styles.half]} placeholder="Preço" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
                    <TextInput style={[styles.input, styles.half]} placeholder="Min" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
                </View>
                <TouchableOpacity style={styles.btn} onPress={handleCreate}>
                    <Text style={styles.btnText}>Adicionar serviço</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
                services.map((s) => (
                    <View key={s.id} style={styles.card}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardName}>{s.name}</Text>
                            <Text style={styles.cardMeta}>R$ {s.price.toFixed(2)} · {s.duration_minutes} min</Text>
                        </View>
                        <TouchableOpacity onPress={() => toggleActive(s)}>
                            <Text style={{ color: s.active ? colors.successDark : colors.textMuted }}>
                                {s.active ? 'Ativo' : 'Inativo'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
    back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
    backText: { ...typography.bodySm, color: colors.primary },
    title: { ...typography.h2, color: colors.textMain, marginBottom: spacing.lg },
    form: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...typography.body },
    row: { flexDirection: 'row', gap: spacing.sm },
    half: { flex: 1 },
    btn: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
    btnText: { ...typography.button, color: colors.white },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
    cardName: { ...typography.bodyMedium, color: colors.textMain },
    cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
