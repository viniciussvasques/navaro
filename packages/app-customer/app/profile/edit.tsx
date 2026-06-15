import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { AvatarPicker } from '../../src/components/AvatarPicker';
import { useAuth } from '../../src/contexts/AuthContext';
import { authService } from '../../src/services/auth';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

export default function EditProfile() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, refreshUser } = useAuth();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(user?.avatar_url || null);
    const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);

    const handleAvatarChange = (uri: string) => {
        setNewAvatarUri(uri);
        setAvatar(uri);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Erro', 'Nome é obrigatório.');
            return;
        }

        setLoading(true);
        try {
            await authService.updateProfile({ name, email });

            if (newAvatarUri) {
                const formData = new FormData();
                const filename = newAvatarUri.split('/').pop() || 'avatar.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const ext = match?.[1]?.toLowerCase();
                const type = ext === 'png' ? 'image/png' : 'image/jpeg';

                formData.append('file', {
                    uri: newAvatarUri,
                    name: filename,
                    type,
                } as any);

                await authService.uploadAvatar(formData);
            }

            await refreshUser();
            Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
            router.back();
        } catch {
            Alert.alert('Erro', 'Não foi possível atualizar o perfil. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="Editar Perfil" showBack />

            <View style={styles.content}>
                <View style={styles.avatarCard}>
                    <AvatarPicker uri={avatar} name={name} onChange={handleAvatarChange} size={120} />
                    <Text style={styles.avatarHint}>Toque para alterar sua foto</Text>
                </View>

                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nome completo</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Seu nome"
                            placeholderTextColor={colors.textLight}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>E-mail</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Seu e-mail"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor={colors.textLight}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Telefone</Text>
                        <View style={[styles.input, styles.disabledInput]}>
                            <Text style={styles.disabledText}>{user?.phone}</Text>
                        </View>
                        <Text style={styles.helper}>O telefone não pode ser alterado.</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.saveBtnText}>Salvar alterações</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, flex: 1 },
    avatarCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        marginBottom: spacing.lg,
        ...shadow.md,
    },
    avatarHint: {
        ...typography.caption,
        color: colors.textMuted,
        marginTop: spacing.md,
    },
    formCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        gap: spacing.lg,
        marginBottom: spacing.xl,
        ...shadow.sm,
    },
    inputGroup: {},
    label: { ...typography.bodySmMedium, color: colors.textMain, marginBottom: spacing.xs },
    input: {
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
        ...typography.body,
        color: colors.textMain,
    },
    disabledInput: { backgroundColor: colors.background },
    disabledText: { color: colors.textMuted },
    helper: { ...typography.caption, color: colors.textLight, marginTop: spacing.xs },
    saveBtn: {
        backgroundColor: colors.primary,
        padding: spacing.lg,
        borderRadius: radius.xl,
        alignItems: 'center',
        ...shadow.md,
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { ...typography.button, color: colors.white },
});
