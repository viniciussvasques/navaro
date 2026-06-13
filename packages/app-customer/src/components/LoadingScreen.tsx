/**
 * Full-screen loading spinner
 */
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

interface Props {
    message?: string;
}

export function LoadingScreen({ message }: Props) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.primary} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    message: {
        ...typography.bodySm,
        color: colors.textMuted,
        marginTop: spacing.lg,
    },
});
