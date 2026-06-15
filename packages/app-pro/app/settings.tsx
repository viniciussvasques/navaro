/**
 * DUNNAA Pro — Establishment settings (mobile)
 */
import React, { useCallback, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    Alert, Switch, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEstablishment } from '../src/contexts/EstablishmentContext';
import api from '../src/services/api';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { colors, typography, spacing, radius } from '../src/theme';

export default function SettingsScreen() {
    const router = useRouter();
    const { selectedId, isLoading } = useEstablishment();
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [queueMode, setQueueMode] = useState(false);
    const [acceptCash, setAcceptCash] = useState(true);

    const load = useCallback(async () => {
        if (!selectedId) return;
        try {
            const { data } = await api.get(`/establishments/${selectedId}`);
            setName(data.name || '');
            setQueueMode(!!data.queue_mode_enabled);
            setAcceptCash(data.accept_cash_payment !== false);
        } catch {
            Alert.alert('Erro', 'Não foi possível carregar configurações.');
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        load();
    }, [load]));

    const save = async () => {
        if (!selectedId) return;
        try {
            await api.patch(`/establishments/${selectedId}`, {
                name: name.trim(),
                queue_mode_enabled: queueMode,
                accept_cash_payment: acceptCash,
            });
            Alert.alert('Salvo', 'Configurações atualizadas.');
        } catch {
            Alert.alert('Erro', 'Não foi possível salvar.');
        }
    };

    if (isLoading) return <LoadingScreen />;

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
            <TouchableOpacity style={styles.back} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color={colors.primary} />
                <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Configurações</Text>

            <View style={styles.form}>
                <Text style={styles.label}>Nome do estabelecimento</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} />

                <View style={styles.switchRow}>
                    <Text style={styles.label}>Modo fila virtual</Text>
                    <Switch value={queueMode} onValueChange={setQueueMode} trackColor={{ true: colors.primary }} />
                </View>
                <View style={styles.switchRow}>
                    <Text style={styles.label}>Aceita pagamento em dinheiro</Text>
                    <Switch value={acceptCash} onValueChange={setAcceptCash} trackColor={{ true: colors.primary }} />
                </View>

                <TouchableOpacity style={styles.btn} onPress={save}>
                    <Text style={styles.btnText}>Salvar</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
    back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
    backText: { ...typography.bodySm, color: colors.primary },
    title: { ...typography.h2, color: colors.textMain, marginBottom: spacing.lg },
    form: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg },
    label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...typography.body },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    btn: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
    btnText: { ...typography.button, color: colors.white },
});
