/**
 * Bottom sheet preview when tapping a map marker
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Establishment } from '../services/establishments';
import { colors, typography, spacing, radius, shadow } from '../theme';

interface Props {
    establishment: Establishment | null;
    onClose: () => void;
    onOpen: (id: string) => void;
}

export function MapEstablishmentSheet({ establishment, onClose, onOpen }: Props) {
    if (!establishment) return null;

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.closeHit} onPress={onClose} />
            <View style={styles.sheet}>
                <View style={styles.handle} />
                <View style={styles.row}>
                    {establishment.cover_url ? (
                        <Image source={{ uri: establishment.cover_url }} style={styles.thumb} />
                    ) : (
                        <View style={[styles.thumb, styles.thumbPlaceholder]}>
                            <Ionicons name="business-outline" size={24} color={colors.textLight} />
                        </View>
                    )}
                    <View style={styles.info}>
                        <View style={styles.nameRow}>
                            <Text style={styles.name} numberOfLines={1}>{establishment.name}</Text>
                            {establishment.is_sponsored && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Destaque</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.meta} numberOfLines={1}>
                            {establishment.city} · {establishment.category}
                            {establishment.distance != null ? ` · ${establishment.distance.toFixed(1)} km` : ''}
                        </Text>
                        {establishment.avg_rating != null && (
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={14} color={colors.star} />
                                <Text style={styles.rating}>{establishment.avg_rating.toFixed(1)}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <TouchableOpacity style={styles.btn} onPress={() => onOpen(establishment.id)}>
                    <Text style={styles.btnText}>Ver estabelecimento</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.white} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    closeHit: {
        position: 'absolute',
        top: -200,
        left: 0,
        right: 0,
        height: 200,
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
        padding: spacing.xl,
        paddingBottom: spacing['3xl'],
        ...shadow.lg,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
    thumb: { width: 72, height: 72, borderRadius: radius.lg },
    thumbPlaceholder: {
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
    name: { ...typography.h4, color: colors.textMain, flexShrink: 1 },
    badge: {
        backgroundColor: colors.warningLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.sm,
    },
    badgeText: { ...typography.caption, color: colors.warning, fontWeight: '700' },
    meta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
    rating: { ...typography.captionMedium, color: colors.textMain },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        padding: spacing.md,
    },
    btnText: { ...typography.button, color: colors.white },
});
