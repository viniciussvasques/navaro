/**
 * Login screen — Phone + OTP
 */
import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
    Platform, Alert, StyleSheet, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { authService } from '../../src/services/auth';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

export default function Login() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { login } = useAuth();

    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const inputRefs = useRef<Array<TextInput | null>>([]);

    const handleOtpChange = (text: string, index: number) => {
        const newOtp = otp.split('');
        // Handle paste
        if (text.length > 1) {
            const pasted = text.slice(0, 6).split('');
            setOtp(pasted.join(''));
            if (pasted.length === 6) {
                inputRefs.current[5]?.focus();
            } else {
                inputRefs.current[pasted.length]?.focus();
            }
            return;
        }

        newOtp[index] = text;
        const finalOtp = newOtp.join('');
        setOtp(finalOtp);

        // Auto advance
        if (text && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const formatPhone = (text: string) => {
        const numbers = text.replace(/\D/g, '');
        if (numbers.length <= 2) return `(${numbers}`;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const rawPhone = phone.replace(/\D/g, '');

    const handleSendOTP = async () => {
        if (rawPhone.length < 10) {
            Alert.alert('Erro', 'Informe um número de telefone válido.');
            return;
        }
        setIsLoading(true);
        try {
            const { data } = await authService.sendOTP(`+55${rawPhone}`);
            setIsRegistering(!data.is_registered);
            setStep('otp');
            setTimeout(() => inputRefs.current[0]?.focus(), 300);
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? error.response?.data?.error?.message
                    ?? error.response?.data?.message
                    ?? (error.message === 'Network Error'
                        ? 'Sem conexão com o servidor. Verifique sua internet.'
                        : error.message)
                : 'Não foi possível enviar o código. Tente novamente.';
            Alert.alert('Erro', message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        const cleanOtp = otp.trim();
        if (cleanOtp.length < 6) {
            Alert.alert('Erro', 'Informe o código completo de 6 dígitos.');
            return;
        }

        if (isRegistering) {
            if (!name.trim()) {
                Alert.alert('Erro', 'Informe seu nome.');
                return;
            }
            if (!email.trim() || !email.includes('@')) {
                Alert.alert('Erro', 'Informe um e-mail válido.');
                return;
            }
        }

        setIsLoading(true);
        try {
            console.log(`Verifying: +55${rawPhone} with code ${cleanOtp}`);
            await login(`+55${rawPhone}`, cleanOtp, email, name);
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Verify error:', error);
            Alert.alert('Erro', 'Código inválido ou expirado. Tente enviar novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const loginBody = (
        <>
            {/* Logo / Branding */}
            <View style={styles.branding}>
                <Image
                    source={require('../../assets/logo-dunnaa-full.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
                <Text style={styles.tagline}>
                    {step === 'phone' ? 'Entre com seu telefone' : 'Confirme seu código'}
                </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
                {step === 'phone' ? (
                    <>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Telefone</Text>
                            <View style={styles.phoneRow}>
                                <View style={styles.prefix}>
                                    <Text style={styles.prefixText}>🇧🇷 +55</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    value={phone}
                                    onChangeText={(t) => setPhone(formatPhone(t))}
                                    placeholder="(11) 99999-9999"
                                    placeholderTextColor={colors.textLight}
                                    keyboardType="phone-pad"
                                    maxLength={15}
                                    autoFocus
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, rawPhone.length < 10 && styles.buttonDisabled]}
                            onPress={handleSendOTP}
                            disabled={isLoading || rawPhone.length < 10}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.buttonText}>Enviar código</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Código de verificação</Text>
                            <View style={styles.otpContainer}>
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <TextInput
                                        key={i}
                                        ref={(ref) => { inputRefs.current[i] = ref; }}
                                        style={[
                                            styles.otpBox,
                                            otp[i] ? styles.otpBoxFilled : null
                                        ]}
                                        value={otp[i] || ''}
                                        onChangeText={(text) => handleOtpChange(text, i)}
                                        onKeyPress={(e) => handleOtpKeyPress(e, i)}
                                        keyboardType="number-pad"
                                        maxLength={6} // Allow paste
                                        textAlign="center"
                                        autoFocus={i === 0}
                                        selectTextOnFocus
                                    />
                                ))}
                            </View>
                        </View>

                        {isRegistering && (
                            <ScrollView
                                style={styles.registerFieldsScroll}
                                contentContainerStyle={styles.registerFieldsContent}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Nome completo</Text>
                                    <TextInput
                                        style={styles.inputFull}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Seu nome"
                                        placeholderTextColor={colors.textLight}
                                        autoCapitalize="words"
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>E-mail</Text>
                                    <TextInput
                                        style={styles.inputFull}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="seu@email.com"
                                        placeholderTextColor={colors.textLight}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={[styles.button, otp.length < 4 && styles.buttonDisabled]}
                            onPress={handleVerifyOTP}
                            disabled={isLoading || otp.length < 4}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.buttonText}>
                                    {isRegistering ? 'Criar conta' : 'Entrar'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backLink}
                            onPress={() => { setStep('phone'); setOtp(''); setIsRegistering(false); }}
                        >
                            <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
                            <Text style={styles.backLinkText}>Trocar número</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            <View style={styles.termsRow}>
                <Text style={styles.terms}>Ao continuar, você aceita os </Text>
                <TouchableOpacity onPress={() => router.push('/profile/terms')}>
                    <Text style={styles.termsLink}>Termos de Uso</Text>
                </TouchableOpacity>
                <Text style={styles.terms}> e a </Text>
                <TouchableOpacity onPress={() => router.push('/profile/privacy')}>
                    <Text style={styles.termsLink}>Política de Privacidade</Text>
                </TouchableOpacity>
                <Text style={styles.terms}>.</Text>
            </View>
        </>
    );

    if (Platform.OS === 'web') {
        return (
            <ScrollView
                style={[styles.container, { paddingTop: insets.top + spacing['3xl'] }]}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing['2xl'] }}
                keyboardShouldPersistTaps="handled"
            >
                {loginBody}
            </ScrollView>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top + spacing['3xl'] }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {loginBody}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing['2xl'],
    },
    branding: {
        alignItems: 'center',
        marginBottom: spacing['4xl'],
    },
    logoImage: {
        width: 260,
        height: 96,
        marginBottom: spacing.lg,
    },
    tagline: {
        ...typography.body,
        color: colors.textMuted,
    },
    form: {
        gap: spacing.xl,
    },
    inputGroup: {
        gap: spacing.sm,
    },
    label: {
        ...typography.label,
        color: colors.textSecondary,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    prefix: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 4,
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    prefixText: {
        ...typography.bodyMedium,
        color: colors.textMain,
    },
    input: {
        flex: 1,
        ...typography.body,
        color: colors.textMain,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 4,
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    /** Nome e e-mail: campo largo, altura mínima e fonte legível */
    inputFull: {
        ...typography.body,
        fontSize: 16,
        lineHeight: 24,
        color: colors.textMain,
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 6,
        minHeight: 52,
    },
    registerFieldsScroll: {
        maxHeight: 220,
    },
    registerFieldsContent: {
        gap: spacing.xl,
        paddingVertical: spacing.sm,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    otpBox: {
        width: 45,
        height: 60,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textMain,
    },
    otpBoxFilled: {
        borderColor: colors.primary,
        backgroundColor: colors.surfaceAlt,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        alignItems: 'center',
        ...shadow.md,
    },
    buttonDisabled: {
        backgroundColor: colors.textLight,
    },
    buttonText: {
        ...typography.button,
        color: colors.white,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    backLinkText: {
        ...typography.bodySm,
        color: colors.textMuted,
    },
    termsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 40,
        left: spacing['2xl'],
        right: spacing['2xl'],
    },
    terms: {
        ...typography.caption,
        color: colors.textLight,
        textAlign: 'center',
    },
    termsLink: {
        ...typography.captionMedium,
        color: colors.primary,
    },
});
