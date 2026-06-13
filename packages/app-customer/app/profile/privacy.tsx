import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { colors, typography, spacing } from '../../src/theme';

export default function Privacy() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="Privacidade" showBack />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.text}>
                    1. Coleta de Dados{'\n'}
                    Coletamos informações que você nos fornece diretamente, como nome, telefone e e-mail.{'\n\n'}
                    2. Uso das Informações{'\n'}
                    Usamos suas informações para fornecer, manter e melhorar nossos serviços, além de processar agendamentos.{'\n\n'}
                    3. Compartilhamento{'\n'}
                    Compartilhamos seus dados de agendamento com os estabelecimentos parceiros.{'\n\n'}
                    4. Segurança{'\n'}
                    Adotamos medidas para proteger suas informações pessoais contra acesso não autorizado.{'\n\n'}
                    5. Seus Direitos{'\n'}
                    Você tem o direito de acessar, corrigir ou excluir seus dados pessoais.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl },
    text: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
});
