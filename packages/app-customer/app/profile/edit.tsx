import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Header } from '../../src/components/Header';
import { useAuth } from '../../src/contexts/AuthContext';
import { authService } from '../../src/services/auth';
import { colors, typography, spacing, radius } from '../../src/theme';

export default function EditProfile() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, refreshUser } = useAuth();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(user?.avatar_url || null);
    const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para mudar a foto.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setNewAvatarUri(result.assets[0].uri);
            setAvatar(result.assets[0].uri); // Preview
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Erro', 'Nome é obrigatório.');
            return;
        }

        setLoading(true);
        try {
            // 1. Update text info
            await authService.updateProfile({ name, email });

            // 2. Upload avatar if changed
            if (newAvatarUri) {
                const formData = new FormData();
                const filename = newAvatarUri.split('/').pop() || 'avatar.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';

                formData.append('file', {
                    uri: newAvatarUri,
                    name: filename,
                    type,
                } as any);

                await authService.uploadAvatar(formData);
            }

            await refreshUser();

            Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
            router.back();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="Editar Perfil" showBack />

            <View style={styles.content}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholder]}>
                                <Text style={styles.placeholderText}>{(name || 'U')[0].toUpperCase()}</Text>
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Ionicons name="camera" size={16} color={colors.white} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Form */}
                <View style={styles.form}>
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

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.saveBtnText}>Salvar Alterações</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, flex: 1 },
    avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
    avatarContainer: { position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    placeholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    placeholderText: { fontSize: 36, fontWeight: 'bold', color: colors.white },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.secondary,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    form: { gap: spacing.lg, marginBottom: spacing['2xl'] },
    inputGroup: {},
    label: { ...typography.bodySmMedium, color: colors.textMain, marginBottom: spacing.xs },
    input: {
        backgroundColor: colors.surface,
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
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { ...typography.button, color: colors.white },
});
