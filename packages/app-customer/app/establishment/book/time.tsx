/**
 * Time slot selection screen
 */
import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../../src/components/Header';
import { TimeSlotChip } from '../../../src/components/TimeSlotChip';
import { establishmentService, TimeSlot } from '../../../src/services/establishments';
import { useAuth } from '../../../src/contexts/AuthContext';
import { colors, typography, spacing, radius, shadow } from '../../../src/theme';

const getNext7Days = () => {
    const days: { date: string; label: string; weekday: string }[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        days.push({
            date: d.toISOString().split('T')[0],
            label: d.getDate().toString().padStart(2, '0'),
            weekday: i === 0
                ? 'Hoje'
                : i === 1
                    ? 'Amanhã'
                    : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        });
    }
    return days;
};

export default function TimeSelection() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        establishmentId: string;
        serviceIds: string;
        totalPrice: string;
        totalDuration: string;
        establishmentName: string;
        staffId: string;
        staffName: string;
    }>();

    const days = getNext7Days();
    const [selectedDate, setSelectedDate] = useState(days[0].date);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            setSelectedTime(null);
            try {
                const staffId = params.staffId === 'any' ? '' : params.staffId!;
                // Fetch slots from API. If staffId is empty, backend should return available slots from any staff.
                const { data } = await establishmentService.getAvailableSlots(
                    params.establishmentId!, staffId, selectedDate
                );
                setSlots(data || []);
            } catch {
                setSlots([]);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [selectedDate, params.establishmentId, params.staffId]);

    const getStaffName = (slot: TimeSlot) => {
        if (selectedStaffId && selectedStaffId !== params.staffId) {
            return slot.staff_name || params.staffName;
        }
        return params.staffName;
    };

    const { isAuthenticated } = useAuth();

    const handleNext = () => {
        if (!selectedTime) {
            Alert.alert('Atenção', 'Selecione um horário.');
            return;
        }

        if (!isAuthenticated) {
            Alert.alert(
                'Login necessário',
                'Você precisa estar logado para confirmar o agendamento.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Fazer Login',
                        onPress: () => router.push('/login')
                    }
                ]
            );
            return;
        }

        // Find the selected slot object
        const slot = slots.find(s => s.time === selectedTime);
        // If we logic dependent on slot existing
        if (!slot) return;

        router.push({
            pathname: '/establishment/book/confirm',
            params: {
                ...params,
                date: selectedDate,
                time: selectedTime,
                staffId: slot.staff_id || selectedStaffId || params.staffId,
                staffName: slot.staff_name || getStaffName(slot),
            },
        });
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
            <Header title="Escolha o horário" />

            {/* Steps */}
            <View style={styles.steps}>
                <View style={[styles.stepDot, styles.stepDone]} />
                <View style={[styles.stepLine, styles.lineDone]} />
                <View style={[styles.stepDot, styles.stepDone]} />
                <View style={[styles.stepLine, styles.lineDone]} />
                <View style={[styles.stepDot, styles.stepActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
            </View>

            {/* Date picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesRow}>
                {days.map((day) => (
                    <TouchableOpacity
                        key={day.date}
                        style={[styles.dateCard, selectedDate === day.date && styles.dateCardActive]}
                        onPress={() => setSelectedDate(day.date)}
                    >
                        <Text style={[styles.dateWeekday, selectedDate === day.date && styles.dateTextActive]}>
                            {day.weekday}
                        </Text>
                        <Text style={[styles.dateNumber, selectedDate === day.date && styles.dateTextActive]}>
                            {day.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Time slots */}
            <ScrollView contentContainerStyle={styles.slotsContainer} showsVerticalScrollIndicator={false}>
                {isLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : slots.length === 0 ? (
                    <View style={styles.emptySlots}>
                        <Ionicons name="time-outline" size={40} color={colors.textLight} />
                        <Text style={styles.emptySlotsText}>Sem horários disponíveis nesta data.</Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.slotsLabel}>Horários disponíveis</Text>
                        <View style={styles.slotsGrid}>
                            {slots.map((slot) => (
                                <TimeSlotChip
                                    key={slot.time}
                                    time={slot.time}
                                    available={slot.available}
                                    selected={selectedTime === slot.time}
                                    onPress={() => {
                                        setSelectedTime(slot.time);
                                        if (slot.staff_id) setSelectedStaffId(slot.staff_id);
                                    }}
                                />
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Bottom button */}
            <TouchableOpacity
                style={[styles.nextBtn, !selectedTime && styles.nextBtnDisabled]}
                onPress={handleNext}
                disabled={!selectedTime}
                activeOpacity={0.8}
            >
                <Text style={styles.nextBtnText}>Confirmar agendamento</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    steps: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: spacing['3xl'], paddingVertical: spacing.lg,
    },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border },
    stepDone: { backgroundColor: colors.successDark },
    stepActive: { backgroundColor: colors.primary, width: 14, height: 14, borderRadius: 7 },
    stepLine: { width: 40, height: 2, backgroundColor: colors.border },
    lineDone: { backgroundColor: colors.successDark },
    datesRow: {
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
        paddingBottom: spacing.xl,
    },
    dateCard: {
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        minWidth: 68,
    },
    dateCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dateWeekday: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
    dateNumber: { ...typography.h4, color: colors.textMain },
    dateTextActive: { color: colors.white },
    slotsContainer: { paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] },
    slotsLabel: { ...typography.bodySmMedium, color: colors.textMuted, marginBottom: spacing.md },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    emptySlots: { alignItems: 'center', paddingTop: spacing['4xl'] },
    emptySlotsText: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.md },
    nextBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
        backgroundColor: colors.primary, marginHorizontal: spacing.xl, paddingVertical: spacing.lg, borderRadius: radius.xl,
    },
    nextBtnDisabled: { backgroundColor: colors.textLight },
    nextBtnText: { ...typography.button, color: colors.white },
});
