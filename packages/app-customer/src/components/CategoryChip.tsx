/**
 * Category chip / filter button
 */
import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, typography, spacing, radius, shadow } from '../theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
    label: string;
    icon?: IoniconName;
    selected: boolean;
    onPress: () => void;
}

export function CategoryChip({ label, icon, selected, onPress }: Props) {
    return (
        <TouchableOpacity
            style={[styles.chip, selected && styles.selected]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View style={styles.row}>
                {icon ? (
                    <Ionicons
                        name={icon}
                        size={16}
                        color={selected ? colors.white : colors.primary}
                    />
                ) : null}
                <Text style={[styles.label, selected && styles.labelSelected]}>
                    {label}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        marginRight: spacing.sm,
        ...shadow.sm,
    },
    selected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    label: {
        ...typography.bodySmMedium,
        color: colors.textMain,
    },
    labelSelected: {
        color: colors.white,
    },
});
