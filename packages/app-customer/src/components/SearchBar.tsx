/**
 * Search bar
 */
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadow } from '../theme';

interface Props {
    value: string;
    onChangeText: (text: string) => void;
    onSubmit?: () => void;
    onFilterPress?: () => void;
    placeholder?: string;
}

export function SearchBar({
    value,
    onChangeText,
    onSubmit,
    onFilterPress,
    placeholder = 'O que você quer hoje?',
}: Props) {
    return (
        <View style={styles.container}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={styles.icon} />
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                onSubmitEditing={onSubmit}
                placeholder={placeholder}
                placeholderTextColor={colors.textLight}
                returnKeyType="search"
            />
            {onFilterPress && (
                <TouchableOpacity style={styles.filterBtn} onPress={onFilterPress}>
                    <Ionicons name="options-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        paddingHorizontal: spacing.lg,
        ...shadow.md,
    },
    icon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        ...typography.body,
        color: colors.textMain,
        paddingVertical: spacing.md + 2,
    },
    filterBtn: {
        padding: spacing.sm,
        marginLeft: spacing.sm,
        backgroundColor: colors.primary + '10',
        borderRadius: radius.md,
    },
});
