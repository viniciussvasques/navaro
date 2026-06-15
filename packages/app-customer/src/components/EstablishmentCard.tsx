/**
 * Establishment card component
 */
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadow } from '../theme';
import type { Establishment } from '../services/establishments';

interface Props {
    establishment: Establishment;
    onPress: () => void;
    compact?: boolean;
}

export function EstablishmentCard({ establishment, onPress, compact }: Props) {
    return (
        <TouchableOpacity
            style={[styles.card, compact && styles.cardCompact]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {establishment.cover_url ? (
                <Image source={{ uri: establishment.cover_url }} style={[styles.image, compact && styles.imageCompact]} />
            ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                    <Ionicons name="business-outline" size={32} color={colors.textLight} />
                </View>
            )}

            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text style={styles.name} numberOfLines={1}>{establishment.name}</Text>
                        {establishment.is_sponsored && (
                            <View style={styles.sponsoredBadge}>
                                <Ionicons name="flash" size={10} color={colors.accentDark} />
                                <Text style={styles.sponsoredText}>Destaque</Text>
                            </View>
                        )}
                    </View>
                    {establishment.avg_rating && (
                        <View style={styles.rating}>
                            <Ionicons name="star" size={14} color={colors.star} />
                            <Text style={styles.ratingText}>{establishment.avg_rating.toFixed(1)}</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.address} numberOfLines={1}>
                    {establishment.city} - {establishment.state}
                    {establishment.distance != null && ` • ${establishment.distance.toFixed(1)} km`}
                </Text>

                <View style={styles.footer}>
                    {establishment.min_price != null && (
                        <Text style={styles.price}>
                            A partir de R$ {establishment.min_price.toFixed(2)}
                        </Text>
                    )}
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>
                            {establishment.category === 'barbershop' ? 'Barbearia' :
                                establishment.category === 'salon' ? 'Salão' :
                                    establishment.category === 'beauty_salon' ? 'Beleza' :
                                        establishment.category === 'spa' ? 'Spa' : 'Outro'}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        ...shadow.md,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    cardCompact: {
        width: 280,
        marginBottom: 0,
    },
    image: {
        width: '100%',
        height: 140,
    },
    imageCompact: {
        height: 110,
    },
    imagePlaceholder: {
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    titleRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginRight: spacing.sm,
    },
    name: {
        ...typography.h4,
        color: colors.textMain,
        flexShrink: 1,
    },
    sponsoredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: colors.accentLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.full,
    },
    sponsoredText: {
        ...typography.caption,
        color: colors.accentDark,
        fontWeight: '700',
        fontSize: 10,
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surfaceAlt,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },
    ratingText: {
        ...typography.captionMedium,
        color: colors.textMain,
    },
    address: {
        ...typography.bodySm,
        color: colors.textMuted,
        marginBottom: spacing.md,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    price: {
        ...typography.bodySmMedium,
        color: colors.primary,
    },
    categoryBadge: {
        backgroundColor: colors.accent + '33',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },
    categoryText: {
        ...typography.caption,
        color: colors.primaryDark,
    },
});
