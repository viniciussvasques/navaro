/**
 * Time slot chip
 */
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';

interface Props {
    time: string;
    available: boolean;
    selected: boolean;
    onPress: () => void;
}

export function TimeSlotChip({ time, available, selected, onPress }: Props) {
    return (
        <TouchableOpacity
            style={[
                styles.chip,
                selected && styles.selected,
                !available && styles.disabled,
            ]}
            onPress={onPress}
            disabled={!available}
            activeOpacity={0.7}
        >
            <Text
                style={[
                    styles.text,
                    selected && styles.textSelected,
                    !available && styles.textDisabled,
                ]}
            >
                {time}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        minWidth: 80,
        alignItems: 'center',
        margin: spacing.xs,
    },
    selected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    disabled: {
        backgroundColor: colors.background,
        borderColor: colors.borderLight,
    },
    text: {
        ...typography.bodySmMedium,
        color: colors.textMain,
    },
    textSelected: {
        color: colors.white,
    },
    textDisabled: {
        color: colors.textLight,
    },
});
