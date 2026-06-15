/**
 * Advanced search filters modal
 */
import React, { useEffect, useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../theme';

export type SearchFilters = {
    category: string;
    radiusKm: number | null;
    maxPrice: number | null;
    minRating: number | null;
};

export const DEFAULT_FILTERS: SearchFilters = {
    category: 'all',
    radiusKm: null,
    maxPrice: null,
    minRating: null,
};

const CATEGORIES = [
    { key: 'all', label: 'Todos' },
    { key: 'barbershop', label: 'Barbearia' },
    { key: 'salon', label: 'Salão' },
    { key: 'beauty_salon', label: 'Beleza' },
    { key: 'spa', label: 'Spa' },
    { key: 'esthetics', label: 'Estética' },
];

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];

interface Props {
    visible: boolean;
    filters: SearchFilters;
    onClose: () => void;
    onApply: (filters: SearchFilters) => void;
}

export function SearchFiltersModal({ visible, filters, onClose, onApply }: Props) {
    const [local, setLocal] = useState(filters);

    useEffect(() => {
        if (visible) setLocal(filters);
    }, [visible, filters]);

    const activeCount = [
        local.category !== 'all',
        local.radiusKm != null,
        local.maxPrice != null,
        local.minRating != null,
    ].filter(Boolean).length;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Filtros</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.textMain} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>Categoria</Text>
                        <View style={styles.chipRow}>
                            {CATEGORIES.map((c) => (
                                <TouchableOpacity
                                    key={c.key}
                                    style={[styles.chip, local.category === c.key && styles.chipActive]}
                                    onPress={() => setLocal({ ...local, category: c.key })}
                                >
                                    <Text style={[styles.chipText, local.category === c.key && styles.chipTextActive]}>
                                        {c.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Raio máximo (km)</Text>
                        <View style={styles.chipRow}>
                            <TouchableOpacity
                                style={[styles.chip, local.radiusKm == null && styles.chipActive]}
                                onPress={() => setLocal({ ...local, radiusKm: null })}
                            >
                                <Text style={[styles.chipText, local.radiusKm == null && styles.chipTextActive]}>
                                    Qualquer
                                </Text>
                            </TouchableOpacity>
                            {RADIUS_OPTIONS.map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.chip, local.radiusKm === r && styles.chipActive]}
                                    onPress={() => setLocal({ ...local, radiusKm: r })}
                                >
                                    <Text style={[styles.chipText, local.radiusKm === r && styles.chipTextActive]}>
                                        {r} km
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Preço máximo (R$)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="decimal-pad"
                            placeholder="Ex: 80"
                            placeholderTextColor={colors.textLight}
                            value={local.maxPrice != null ? String(local.maxPrice) : ''}
                            onChangeText={(t) =>
                                setLocal({ ...local, maxPrice: t ? Number(t.replace(',', '.')) : null })
                            }
                        />

                        <Text style={styles.label}>Avaliação mínima</Text>
                        <View style={styles.chipRow}>
                            {[null, 3, 4, 4.5].map((r) => (
                                <TouchableOpacity
                                    key={String(r)}
                                    style={[styles.chip, local.minRating === r && styles.chipActive]}
                                    onPress={() => setLocal({ ...local, minRating: r })}
                                >
                                    <Text style={[styles.chipText, local.minRating === r && styles.chipTextActive]}>
                                        {r == null ? 'Qualquer' : `${r}+ estrelas`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.clearBtn}
                            onPress={() => setLocal(DEFAULT_FILTERS)}
                        >
                            <Text style={styles.clearText}>Limpar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.applyBtn}
                            onPress={() => {
                                onApply(local);
                                onClose();
                            }}
                        >
                            <Text style={styles.applyText}>
                                Aplicar{activeCount > 0 ? ` (${activeCount})` : ''}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
        padding: spacing.xl,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: { ...typography.h3, color: colors.textMain },
    label: { ...typography.captionMedium, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { ...typography.caption, color: colors.textMuted },
    chipTextActive: { color: colors.white, fontWeight: '600' },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
        ...typography.body,
        color: colors.textMain,
    },
    actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
    clearBtn: {
        flex: 1,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    clearText: { ...typography.buttonSm, color: colors.textMuted },
    applyBtn: {
        flex: 2,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    applyText: { ...typography.button, color: colors.white },
});
