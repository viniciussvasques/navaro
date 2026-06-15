import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, shadow } from '../theme';

interface Section {
    title: string;
    body: string;
}

interface Props {
    title: string;
    updatedAt: string;
    sections: readonly Section[];
    bottomInset?: number;
}

export function LegalDocument({ title, updatedAt, sections, bottomInset = 24 }: Props) {
    return (
        <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.hero}>
                <Text style={styles.heroTitle}>{title}</Text>
                <Text style={styles.heroMeta}>Última atualização: {updatedAt}</Text>
            </View>
            {sections.map((section) => (
                <View key={section.title} style={styles.card}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionBody}>{section.body}</Text>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: spacing.xl,
        gap: spacing.md,
    },
    hero: {
        backgroundColor: colors.primary,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.sm,
        ...shadow.md,
    },
    heroTitle: {
        ...typography.h3,
        color: colors.white,
        marginBottom: spacing.xs,
    },
    heroMeta: {
        ...typography.caption,
        color: colors.accentLight,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadow.sm,
    },
    sectionTitle: {
        ...typography.bodyMedium,
        color: colors.textMain,
        marginBottom: spacing.sm,
    },
    sectionBody: {
        ...typography.bodySm,
        color: colors.textSecondary,
        lineHeight: 22,
    },
});
