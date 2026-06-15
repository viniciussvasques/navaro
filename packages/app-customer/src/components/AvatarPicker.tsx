import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, radius, shadow } from '../theme';

interface Props {
    uri: string | null;
    name: string;
    onChange: (uri: string) => void;
    size?: number;
}

async function pickImage(source: 'camera' | 'library'): Promise<string | null> {
    if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar sua foto.');
            return null;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.85,
        });
        return result.canceled ? null : result.assets[0].uri;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para escolher sua foto.');
        return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
        selectionLimit: 1,
    });
    return result.canceled ? null : result.assets[0].uri;
}

export function AvatarPicker({ uri, name, onChange, size = 112 }: Props) {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handlePick = async (source: 'camera' | 'library') => {
        setSheetOpen(false);
        setLoading(true);
        try {
            const nextUri = await pickImage(source);
            if (nextUri) onChange(nextUri);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <TouchableOpacity
                onPress={() => setSheetOpen(true)}
                style={[styles.wrapper, { width: size, height: size }]}
                activeOpacity={0.85}
            >
                {uri ? (
                    <Image source={{ uri }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />
                ) : (
                    <View style={[styles.avatar, styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
                        <Text style={styles.initial}>{(name || 'U')[0].toUpperCase()}</Text>
                    </View>
                )}
                {loading ? (
                    <View style={[styles.overlay, { borderRadius: size / 2 }]}>
                        <ActivityIndicator color={colors.white} />
                    </View>
                ) : (
                    <View style={styles.badge}>
                        <Ionicons name="camera-outline" size={18} color={colors.white} />
                    </View>
                )}
            </TouchableOpacity>

            <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Foto de perfil</Text>
                        <TouchableOpacity style={styles.sheetOption} onPress={() => handlePick('camera')}>
                            <Ionicons name="camera-outline" size={22} color={colors.primary} />
                            <Text style={styles.sheetOptionText}>Tirar foto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sheetOption} onPress={() => handlePick('library')}>
                            <Ionicons name="images-outline" size={22} color={colors.primary} />
                            <Text style={styles.sheetOptionText}>Escolher da galeria</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sheetCancel} onPress={() => setSheetOpen(false)}>
                            <Text style={styles.sheetCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    wrapper: { position: 'relative', alignSelf: 'center' },
    avatar: { borderWidth: 3, borderColor: colors.accent + '55' },
    placeholder: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initial: { fontSize: 40, fontWeight: '700', color: colors.white },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.surface,
        ...shadow.sm,
    },
    backdrop: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius['2xl'],
        borderTopRightRadius: radius['2xl'],
        padding: spacing.xl,
        paddingBottom: spacing['3xl'],
        ...shadow.lg,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    sheetTitle: {
        ...typography.h4,
        color: colors.textMain,
        marginBottom: spacing.lg,
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    sheetOptionText: { ...typography.body, color: colors.textMain },
    sheetCancel: {
        marginTop: spacing.lg,
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    sheetCancelText: { ...typography.bodyMedium, color: colors.textMuted },
});
