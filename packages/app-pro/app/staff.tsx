/**
 * DUNNAA Pro — Staff management (mobile)
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

type Staff = { id: string; name: string; role: string; active: boolean };

export default function StaffScreen() {
    const router = useRouter();
    const { selectedId, isLoading } = useEstablishment();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [role, setRole] = useState('barbeiro');

    const load = useCallback(async () => {
        if (!selectedId) return;
        try {
            const { data } = await api.get(`/establishments/${selectedId}/staff`);
            setStaff(Array.isArray(data) ? data : []);
        } catch {
            setStaff([]);
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
            await api.post(`/establishments/${selectedId}/staff`, {
                name: name.trim(),
                role,
                phone: '+5511999999999',
            });
            setName('');
            await load();
        } catch {
            Alert.alert('Erro', 'Não foi possível adicionar profissional.');
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
            <Text style={styles.title}>Equipe</Text>

            <View style={styles.form}>
                <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={setName} />
                <TextInput style={styles.input} placeholder="Função" value={role} onChangeText={setRole} />
                <TouchableOpacity style={styles.btn} onPress={handleCreate}>
                    <Text style={styles.btnText}>Adicionar profissional</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator color={colors.primary} />
            ) : (
                staff.map((s) => (
                    <View key={s.id} style={styles.card}>
                        <Text style={styles.cardName}>{s.name}</Text>
                        <Text style={styles.cardMeta}>{s.role} · {s.active ? 'Ativo' : 'Inativo'}</Text>
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
    btn: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
    btnText: { ...typography.button, color: colors.white },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
    cardName: { ...typography.bodyMedium, color: colors.textMain },
    cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
