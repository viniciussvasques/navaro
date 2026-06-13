import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/Header';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function Help() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const handleEmail = () => {
        Linking.openURL('mailto:suporte@dunnaa.com');
    };

    const handleWhatsApp = () => {
        Linking.openURL('https://wa.me/5511999999999'); // Substituir pelo número real
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="Ajuda e Suporte" showBack />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.description}>
                    Precisa de ajuda com o aplicativo ou tem alguma dúvida? Entre em contato com nossa equipe de suporte.
                </Text>

                <TouchableOpacity style={styles.card} onPress={handleWhatsApp}>
                    <Ionicons name="logo-whatsapp" size={24} color={colors.success} />
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>WhatsApp</Text>
                        <Text style={styles.cardSub}>Fale com nosso suporte em tempo real</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={handleEmail}>
                    <Ionicons name="mail-outline" size={24} color={colors.primary} />
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>E-mail</Text>
                        <Text style={styles.cardSub}>Envie-nos uma mensagem detalhada</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>

                <View style={styles.faq}>
                    <Text style={styles.faqTitle}>Perguntas Frequentes</Text>

                    <View style={styles.faqItem}>
                        <Text style={styles.question}>Como cancelo um agendamento?</Text>
                        <Text style={styles.answer}>Vá em "Meus Agendamentos", selecione o agendamento e clique em "Cancelar".</Text>
                    </View>

                    <View style={styles.faqItem}>
                        <Text style={styles.question}>Como funcionam os pagamentos?</Text>
                        <Text style={styles.answer}>O pagamento pode ser feito pelo app ou diretamente no local, dependendo do estabelecimento.</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl },
    description: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    cardContent: { flex: 1, marginLeft: spacing.md },
    cardTitle: { ...typography.bodyMedium, color: colors.textMain },
    cardSub: { ...typography.caption, color: colors.textMuted },
    faq: { marginTop: spacing['2xl'] },
    faqTitle: { ...typography.h4, color: colors.textMain, marginBottom: spacing.lg },
    faqItem: { marginBottom: spacing.lg },
    question: { ...typography.bodyMedium, color: colors.textMain, marginBottom: spacing.xs },
    answer: { ...typography.bodySm, color: colors.textSecondary },
});
