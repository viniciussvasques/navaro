/**
 * DUNNAA Pro — Destaque / sponsored ads config
 */
import React, { useCallback, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useEstablishment } from '../../src/contexts/EstablishmentContext';
import api from '../../src/services/api';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { colors, typography, spacing, radius } from '../../src/theme';

type Summary = {
    is_sponsored: boolean;
    total_impressions: number;
    total_clicks: number;
    total_spent: number;
    campaigns: Array<{ id: string; name: string | null; budget_daily: number; active: boolean; status: string }>;
};

export default function DestaqueScreen() {
    const { selectedId, isLoading } = useEstablishment();
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [budgetDaily, setBudgetDaily] = useState('29.90');
    const [radiusKm, setRadiusKm] = useState('15');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        if (!selectedId) return;
        try {
            const { data } = await api.get(`/establishments/${selectedId}/ad-campaigns/summary`);
            setSummary(data);
        } catch {
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        load();
    }, [load]));

    const handleCreate = async () => {
        if (!selectedId) return;
        setSubmitting(true);
        try {
            await api.post(`/establishments/${selectedId}/ad-campaigns`, {
                name: 'Destaque mobile',
                budget_daily: Number(budgetDaily),
                start_date: new Date().toISOString().slice(0, 10),
                target_radius_km: Number(radiusKm),
                placement: 'search_top',
                priority: 10,
                active: true,
            });
            Alert.alert('Sucesso', 'Campanha de destaque ativada!');
            await load();
        } catch {
            Alert.alert('Erro', 'Não foi possível criar a campanha.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleCampaign = async (id: string, active: boolean) => {
        if (!selectedId) return;
        try {
            await api.patch(`/establishments/${selectedId}/ad-campaigns/${id}`, {
                active: !active,
                status: active ? 'paused' : 'active',
            });
            await load();
        } catch {
            Alert.alert('Erro', 'Não foi possível atualizar a campanha.');
        }
    };

    if (isLoading) return <LoadingScreen />;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        >
            <Text style={styles.title}>Destaque</Text>
            <Text style={styles.subtitle}>
                Apareça no topo da busca. Defina orçamento diário e área de cobertura.
            </Text>

            {loading && !summary ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
                <>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{summary?.is_sponsored ? 'Ativo' : 'Off'}</Text>
                            <Text style={styles.statLabel}>Status</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{summary?.total_impressions ?? 0}</Text>
                            <Text style={styles.statLabel}>Impressões</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{summary?.total_clicks ?? 0}</Text>
                            <Text style={styles.statLabel}>Cliques</Text>
                        </View>
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.formTitle}>Nova campanha rápida</Text>
                        <Text style={styles.label}>Orçamento diário (R$)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="decimal-pad"
                            value={budgetDaily}
                            onChangeText={setBudgetDaily}
                        />
                        <Text style={styles.label}>Raio de cobertura (km)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={radiusKm}
                            onChangeText={setRadiusKm}
                        />
                        <TouchableOpacity
                            style={styles.btn}
                            onPress={handleCreate}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.btnText}>Ativar destaque</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {(summary?.campaigns ?? []).map((c) => (
                        <View key={c.id} style={styles.campaign}>
                            <Text style={styles.campaignName}>{c.name || 'Campanha'}</Text>
                            <Text style={styles.campaignMeta}>
                                R$ {c.budget_daily.toFixed(2)}/dia · {c.status}
                            </Text>
                            <TouchableOpacity
                                style={styles.toggleBtn}
                                onPress={() => toggleCampaign(c.id, c.active)}
                            >
                                <Text style={styles.toggleText}>{c.active ? 'Pausar' : 'Ativar'}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
    title: { ...typography.h2, color: colors.textMain },
    subtitle: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    stat: {
        flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
        padding: spacing.md, alignItems: 'center',
    },
    statValue: { ...typography.h3, color: colors.primary },
    statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
    form: {
        backgroundColor: colors.surface, borderRadius: radius.xl,
        padding: spacing.lg, marginBottom: spacing.lg,
    },
    formTitle: { ...typography.h4, color: colors.textMain, marginBottom: spacing.md },
    label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
    input: {
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
        padding: spacing.md, marginBottom: spacing.md, ...typography.body,
    },
    btn: {
        backgroundColor: colors.primary, borderRadius: radius.lg,
        padding: spacing.md, alignItems: 'center',
    },
    btnText: { ...typography.button, color: colors.white },
    campaign: {
        backgroundColor: colors.surface, borderRadius: radius.lg,
        padding: spacing.lg, marginBottom: spacing.sm,
    },
    campaignName: { ...typography.bodyMedium, color: colors.textMain },
    campaignMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
    toggleBtn: { marginTop: spacing.sm },
    toggleText: { ...typography.bodySm, color: colors.primary, fontWeight: '600' },
});
