/**
 * Category chip / filter button
 */
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';

interface Props {
    label: string;
    icon?: string;
    selected: boolean;
    onPress: () => void;
}

export function CategoryChip({ label, selected, onPress }: Props) {
    return (
        <TouchableOpacity
            style={[styles.chip, selected && styles.selected]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.label, selected && styles.labelSelected]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        marginRight: spacing.sm,
    },
    selected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    label: {
        ...typography.bodySmMedium,
        color: colors.textMain,
    },
    labelSelected: {
        color: colors.white,
    },
});
