/**
 * Business hours display
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../theme';

const DAY_LABELS: Record<string, string> = {
    mon: 'Seg',
    tue: 'Ter',
    wed: 'Qua',
    thu: 'Qui',
    fri: 'Sex',
    sat: 'Sáb',
    sun: 'Dom',
};

const ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

type Hours = Record<string, { open?: string; close?: string; closed?: boolean }>;

export function BusinessHours({ hours }: { hours?: Hours | null }) {
    if (!hours || Object.keys(hours).length === 0) {
        return null;
    }

    const todayKey = ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Horário de funcionamento</Text>
            {ORDER.map((day) => {
                const slot = hours[day];
                if (!slot) return null;
                const isToday = day === todayKey;
                const closed = slot.closed || !slot.open;
                const label = closed ? 'Fechado' : `${slot.open} – ${slot.close}`;
                return (
                    <View key={day} style={[styles.row, isToday && styles.rowToday]}>
                        <Text style={[styles.day, isToday && styles.dayToday]}>{DAY_LABELS[day]}</Text>
                        <Text style={[styles.time, closed && styles.closed, isToday && styles.dayToday]}>
                            {label}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...shadow.sm,
    },
    title: { ...typography.h4, color: colors.textMain, marginBottom: spacing.md },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
    },
    rowToday: {
        backgroundColor: `${colors.primaryLight}22`,
        marginHorizontal: -spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
    },
    day: { ...typography.bodySm, color: colors.textMuted },
    dayToday: { color: colors.primary, fontWeight: '600' },
    time: { ...typography.bodySmMedium, color: colors.textMain },
    closed: { color: colors.textLight },
});
