/**
 * DUNNAA Pro — Promotions (mobile)
 */
import React, { useCallback, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEstablishment } from '../src/contexts/EstablishmentContext';
import api from '../src/services/api';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { colors, typography, spacing, radius } from '../src/theme';

type Promo = { id: string; title: string; discount_percent: number | null; active: boolean };

export default function PromotionsScreen() {
    const router = useRouter();
    const { selectedId, isLoading } = useEstablishment();
    const [promos, setPromos] = useState<Promo[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [discount, setDiscount] = useState('10');

    const load = useCallback(async () => {
        if (!selectedId) return;
        try {
            const { data } = await api.get(`/establishments/${selectedId}/promotions`);
            setPromos(Array.isArray(data) ? data : []);
        } catch {
            setPromos([]);
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        load();
    }, [load]));

    const handleCreate = async () => {
        if (!selectedId || !title.trim()) return;
        const now = new Date();
        const ends = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        try {
            await api.post(`/establishments/${selectedId}/promotions`, {
                title: title.trim(),
                discount_percent: Number(discount),
                starts_at: now.toISOString(),
                ends_at: ends.toISOString(),
            });
            setTitle('');
            await load();
        } catch {
            Alert.alert('Erro', 'Não foi possível criar promoção.');
        }
    };

    if (isLoading) return <LoadingScreen />;

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
            <TouchableOpacity style={styles.back} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color={colors.primary} />
                <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Promoções</Text>

            <View style={styles.form}>
                <TextInput style={styles.input} placeholder="Título" value={title} onChangeText={setTitle} />
                <TextInput style={styles.input} placeholder="Desconto %" value={discount} onChangeText={setDiscount} keyboardType="number-pad" />
                <TouchableOpacity style={styles.btn} onPress={handleCreate}>
                    <Text style={styles.btnText}>Criar promoção</Text>
                </TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator color={colors.primary} /> : promos.map((p) => (
                <View key={p.id} style={styles.card}>
                    <Text style={styles.cardName}>{p.title}</Text>
                    <Text style={styles.cardMeta}>
                        {p.discount_percent != null ? `${p.discount_percent}% off` : 'Desconto'} · {p.active ? 'Ativa' : 'Inativa'}
                    </Text>
                </View>
            ))}
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
    btn: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
    btnText: { ...typography.button, color: colors.white },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
    cardName: { ...typography.bodyMedium, color: colors.textMain },
    cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
