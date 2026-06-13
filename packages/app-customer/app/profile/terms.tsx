import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { colors, typography, spacing } from '../../src/theme';

export default function Terms() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="Termos de Uso" showBack />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.text}>
                    1. Aceitação dos Termos{'\n'}
                    Ao acessar e usar o DUNNAA, você concorda em cumprir estes termos e condições.{'\n\n'}
                    2. Uso do Serviço{'\n'}
                    O DUNNAA é uma plataforma de agendamento. Você concorda em usar o serviço apenas para fins legais.{'\n\n'}
                    3. Contas de Usuário{'\n'}
                    Você é responsável por manter a confidencialidade de sua conta e senha.{'\n\n'}
                    4. Cancelamentos{'\n'}
                    Cancelamentos devem seguir a política estabelecida por cada estabelecimento.{'\n\n'}
                    5. Alterações{'\n'}
                    Reservamo-nos o direito de modificar estes termos a qualquer momento.
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
