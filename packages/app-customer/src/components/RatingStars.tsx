/**
 * Star rating display
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';

interface Props {
    rating: number;
    count?: number;
    size?: number;
    showNumber?: boolean;
}

export function RatingStars({ rating, count, size = 16, showNumber = true }: Props) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars.push(<Ionicons key={i} name="star" size={size} color={colors.star} />);
        } else if (i - 0.5 <= rating) {
            stars.push(<Ionicons key={i} name="star-half" size={size} color={colors.star} />);
        } else {
            stars.push(<Ionicons key={i} name="star-outline" size={size} color={colors.textLight} />);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.stars}>{stars}</View>
            {showNumber && <Text style={styles.rating}>{rating.toFixed(1)}</Text>}
            {count != null && <Text style={styles.count}>({count})</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    stars: {
        flexDirection: 'row',
        gap: 2,
    },
    rating: {
        ...typography.bodySmMedium,
        color: colors.textMain,
    },
    count: {
        ...typography.caption,
        color: colors.textMuted,
    },
});
