/**
 * Destaques & monetização — visibilidade patrocinada
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

const benefits = [
    { icon: 'flash-outline' as const, title: 'Mais visibilidade', text: 'Apareça no topo da home e na busca com selo Destaque.' },
    { icon: 'trending-up-outline' as const, title: 'Mais agendamentos', text: 'Estabelecimentos em destaque recebem até 3x mais cliques.' },
    { icon: 'map-outline' as const, title: 'Destaque no mapa', text: 'Pin diferenciado e prioridade na listagem por proximidade.' },
    { icon: 'analytics-outline' as const, title: 'Relatórios', text: 'Acompanhe impressões, cliques e conversões em tempo real.' },
];

export default function PromoteScreen() {
    const insets = useSafeAreaInsets();

    const contactSales = () => {
        Linking.openURL('https://wa.me/5511999999999?text=Ol%C3%A1%2C%20quero%20saber%20sobre%20destaques%20no%20DUNNAA');
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Header title="Destaques & parcerias" showBack />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <View style={styles.heroIcon}>
                        <Ionicons name="diamond-outline" size={32} color={colors.accent} />
                    </View>
                    <Text style={styles.heroTitle}>Destaque seu estabelecimento</Text>
                    <Text style={styles.heroSub}>
                        Planos de visibilidade patrocinada para barbearias, salões e clínicas aparecerem primeiro para clientes da região.
                    </Text>
                </View>

                {benefits.map((item) => (
                    <View key={item.title} style={styles.benefitCard}>
                        <View style={styles.benefitIcon}>
                            <Ionicons name={item.icon} size={22} color={colors.primary} />
                        </View>
                        <View style={styles.benefitBody}>
                            <Text style={styles.benefitTitle}>{item.title}</Text>
                            <Text style={styles.benefitText}>{item.text}</Text>
                        </View>
                    </View>
                ))}

                <View style={styles.planCard}>
                    <Text style={styles.planLabel}>Planos a partir de</Text>
                    <Text style={styles.planPrice}>R$ 99<Text style={styles.planPeriod}>/mês</Text></Text>
                    <Text style={styles.planNote}>Valores variam por região e categoria. Fale com nosso time comercial.</Text>
                </View>

                <TouchableOpacity style={styles.ctaBtn} onPress={contactSales} activeOpacity={0.85}>
                    <Ionicons name="logo-whatsapp" size={22} color={colors.white} />
                    <Text style={styles.ctaText}>Falar com vendas</Text>
                </TouchableOpacity>

                <Text style={styles.footerNote}>
                    Área dedicada à monetização de destaques. Estabelecimentos parceiros gerenciam campanhas pelo painel DUNNAA Pro.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, paddingBottom: spacing['4xl'] },
    hero: {
        backgroundColor: colors.primary,
        borderRadius: radius['2xl'],
        padding: spacing.xl,
        marginBottom: spacing.xl,
        ...shadow.md,
    },
    heroIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent + '22',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    heroTitle: { ...typography.h3, color: colors.white, marginBottom: spacing.sm },
    heroSub: { ...typography.bodySm, color: colors.accentLight, lineHeight: 22 },
    benefitCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        ...shadow.sm,
    },
    benefitIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    benefitBody: { flex: 1 },
    benefitTitle: { ...typography.bodyMedium, color: colors.textMain },
    benefitText: { ...typography.bodySm, color: colors.textMuted, marginTop: 4, lineHeight: 20 },
    planCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.accent + '44',
        alignItems: 'center',
    },
    planLabel: { ...typography.caption, color: colors.textMuted },
    planPrice: { ...typography.h1, color: colors.primary, marginVertical: spacing.sm },
    planPeriod: { ...typography.body, color: colors.textMuted },
    planNote: { ...typography.caption, color: colors.textLight, textAlign: 'center' },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.successDark,
        borderRadius: radius.xl,
        paddingVertical: spacing.lg,
        ...shadow.md,
    },
    ctaText: { ...typography.button, color: colors.white },
    footerNote: {
        ...typography.caption,
        color: colors.textLight,
        textAlign: 'center',
        marginTop: spacing.xl,
        lineHeight: 18,
    },
});
