/**
 * Staff selection screen
 */
import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../src/components/Header';
import { StaffCard } from '../../../src/components/StaffCard';
import { establishmentService, StaffMember } from '../../../src/services/establishments';
import { colors, typography, spacing, radius } from '../../../src/theme';

export default function StaffSelection() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        establishmentId: string;
        serviceIds: string;
        totalPrice: string;
        totalDuration: string;
        establishmentName: string;
    }>();

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await establishmentService.getStaff(params.establishmentId!);
                setStaff((data || []).filter((s) => s.active));
            } catch {
                Alert.alert('Erro', 'Não foi possível carregar a equipe.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [params.establishmentId]);

    const handleNext = () => {
        if (!selectedStaff) {
            Alert.alert('Atenção', 'Selecione um profissional.');
            return;
        }
        const chosen = staff.find((s) => s.id === selectedStaff);
        router.push({
            pathname: '/establishment/book/time',
            params: {
                ...params,
                staffId: selectedStaff,
                staffName: chosen?.name || '',
            },
        });
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
            <Header title="Escolha o profissional" />

            {/* Steps */}
            <View style={styles.steps}>
                <View style={[styles.stepDot, styles.stepDone]} />
                <View style={[styles.stepLine, styles.lineDone]} />
                <View style={[styles.stepDot, styles.stepActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
            </View>

            <Text style={styles.subtitle}>Quem você prefere?</Text>

            {isLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.staffGrid}
                    showsVerticalScrollIndicator={false}
                >
                    {/* "Sem preferência" option */}
                    <TouchableOpacity
                        style={[styles.anyCard, selectedStaff === 'any' && styles.anyCardActive]}
                        onPress={() => setSelectedStaff('any')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="shuffle-outline" size={28} color={selectedStaff === 'any' ? colors.primary : colors.textMuted} />
                        <Text style={[styles.anyText, selectedStaff === 'any' && styles.anyTextActive]}>
                            Sem preferência
                        </Text>
                    </TouchableOpacity>

                    {/* Staff list */}
                    <View style={styles.staffRow}>
                        {staff.map((s) => (
                            <StaffCard
                                key={s.id}
                                staff={s}
                                selected={selectedStaff === s.id}
                                onSelect={() => setSelectedStaff(s.id)}
                            />
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* Bottom button */}
            <TouchableOpacity
                style={[styles.nextBtn, !selectedStaff && styles.nextBtnDisabled]}
                onPress={handleNext}
                disabled={!selectedStaff}
                activeOpacity={0.8}
            >
                <Text style={styles.nextBtnText}>Escolher horário</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    steps: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['3xl'],
        paddingVertical: spacing.lg,
    },
    stepDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.border,
    },
    stepDone: { backgroundColor: colors.successDark },
    stepActive: { backgroundColor: colors.primary, width: 14, height: 14, borderRadius: 7 },
    stepLine: { width: 40, height: 2, backgroundColor: colors.border },
    lineDone: { backgroundColor: colors.successDark },
    subtitle: {
        ...typography.body,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    staffGrid: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['3xl'],
    },
    anyCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginBottom: spacing.xl,
        gap: spacing.sm,
    },
    anyCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
    anyText: { ...typography.bodyMedium, color: colors.textMuted },
    anyTextActive: { color: colors.primary },
    staffRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        marginHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
    },
    nextBtnDisabled: { backgroundColor: colors.textLight },
    nextBtnText: { ...typography.button, color: colors.white },
});
