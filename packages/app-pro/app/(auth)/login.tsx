import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { authService } from '../../src/services/auth';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function Login() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { login } = useAuth();
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const rawPhone = phone.replace(/\D/g, '');

    const sendOtp = async () => {
        if (rawPhone.length < 10) {
            Alert.alert('Erro', 'Informe um telefone válido.');
            return;
        }
        setLoading(true);
        try {
            await authService.sendOTP(`+55${rawPhone}`);
            setStep('otp');
        } catch {
            Alert.alert('Erro', 'Não foi possível enviar o código.');
        } finally {
            setLoading(false);
        }
    };

    const verify = async () => {
        if (otp.length < 6) {
            Alert.alert('Erro', 'Informe o código de 6 dígitos.');
            return;
        }
        setLoading(true);
        try {
            await login(`+55${rawPhone}`, otp);
            router.replace('/(tabs)');
        } catch (e: any) {
            Alert.alert('Erro', e?.message || 'Código inválido ou acesso negado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top + spacing['3xl'] }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Text style={styles.brand}>DUNNAA Pro</Text>
            <Text style={styles.subtitle}>Gestão do seu estabelecimento</Text>

            {step === 'phone' ? (
                <>
                    <TextInput
                        style={styles.input}
                        placeholder="(11) 99999-9999"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />
                    <TouchableOpacity style={styles.btn} onPress={sendOtp} disabled={loading}>
                        {loading ? <ActivityIndicator color={colors.white} /> : (
                            <Text style={styles.btnText}>Enviar código</Text>
                        )}
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <TextInput
                        style={styles.input}
                        placeholder="Código SMS"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otp}
                        onChangeText={setOtp}
                    />
                    <TouchableOpacity style={styles.btn} onPress={verify} disabled={loading}>
                        {loading ? <ActivityIndicator color={colors.white} /> : (
                            <Text style={styles.btnText}>Entrar</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setStep('phone')}>
                        <Text style={styles.link}>Alterar telefone</Text>
                    </TouchableOpacity>
                </>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing['2xl'] },
    brand: { ...typography.h1, color: colors.primary, marginBottom: spacing.sm },
    subtitle: { ...typography.bodySm, color: colors.textMuted, marginBottom: spacing['3xl'] },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...typography.body,
    },
    btn: {
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        padding: spacing.lg,
        alignItems: 'center',
    },
    btnText: { ...typography.button, color: colors.white },
    link: { ...typography.bodySm, color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
});
