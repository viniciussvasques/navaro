/**
 * Staff member card
 */
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadow } from '../theme';
import type { StaffMember } from '../services/establishments';

interface Props {
    staff: StaffMember;
    selected: boolean;
    onSelect: () => void;
}

export function StaffCard({ staff, selected, onSelect }: Props) {
    return (
        <TouchableOpacity
            style={[styles.card, selected && styles.selected]}
            onPress={onSelect}
            activeOpacity={0.7}
        >
            {staff.avatar_url ? (
                <Image source={{ uri: staff.avatar_url }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={28} color={colors.textLight} />
                </View>
            )}
            <Text style={styles.name} numberOfLines={1}>{staff.name}</Text>
            <Text style={styles.role}>{staff.role}</Text>
            {staff.avg_rating && (
                <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color={colors.star} />
                    <Text style={styles.ratingText}>{staff.avg_rating.toFixed(1)}</Text>
                </View>
            )}
            {selected && (
                <View style={styles.checkBadge}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1.5,
        borderColor: colors.border,
        width: 130,
        marginRight: spacing.md,
        ...shadow.sm,
    },
    selected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '08',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: spacing.sm,
    },
    avatarPlaceholder: {
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        ...typography.bodySmMedium,
        color: colors.textMain,
        textAlign: 'center',
    },
    role: {
        ...typography.caption,
        color: colors.textMuted,
        marginTop: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: spacing.xs,
    },
    ratingText: {
        ...typography.caption,
        color: colors.textMain,
    },
    checkBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
    },
});
