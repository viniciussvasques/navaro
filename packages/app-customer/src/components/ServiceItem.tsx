/**
 * Selectable service item
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../theme';
import type { Service } from '../services/establishments';

interface Props {
    service: Service;
    selected: boolean;
    onToggle: () => void;
}

export function ServiceItem({ service, selected, onToggle }: Props) {
    return (
        <TouchableOpacity
            style={[styles.container, selected && styles.selected]}
            onPress={onToggle}
            activeOpacity={0.7}
        >
            <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                {selected && <Ionicons name="checkmark" size={16} color={colors.white} />}
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{service.name}</Text>
                <Text style={styles.duration}>{service.duration_minutes} min</Text>
            </View>
            <Text style={styles.price}>R$ {service.price.toFixed(2)}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: colors.border,
        marginBottom: spacing.sm,
    },
    selected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '08',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: radius.sm,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    checkboxActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    info: {
        flex: 1,
    },
    name: {
        ...typography.bodyMedium,
        color: colors.textMain,
    },
    duration: {
        ...typography.caption,
        color: colors.textMuted,
        marginTop: 2,
    },
    price: {
        ...typography.price,
        color: colors.primary,
    },
});
