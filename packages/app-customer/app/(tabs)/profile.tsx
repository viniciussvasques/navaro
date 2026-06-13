/**
 * Profile screen
 */
import React from 'react';
import {
    View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Alert, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

const menuItems = [
    { icon: 'person-outline', label: 'Editar perfil', route: '/profile/edit' },
    { icon: 'card-outline', label: 'Minhas assinaturas', route: '/profile/subscriptions' },
    { icon: 'wallet-outline', label: 'Carteira', route: '/profile/wallet' },
    { icon: 'card-outline', label: 'Meus pagamentos', route: '/profile/payments' },
    { icon: 'notifications-outline', label: 'Notificacoes', route: '/notifications' },
    { icon: 'heart-outline', label: 'Favoritos', route: '/(tabs)/favorites' },
    { icon: 'help-circle-outline', label: 'Ajuda e suporte', route: '/profile/help' },
    { icon: 'document-text-outline', label: 'Termos de uso', route: '/profile/terms' },
    { icon: 'shield-outline', label: 'Privacidade', route: '/profile/privacy' },
];

export default function Profile() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout, isAuthenticated } = useAuth();

    const requireLogin = (route: string) => {
        if (!isAuthenticated) {
            router.push('/(auth)/login');
            return;
        }
        router.push(route as any);
    };

    const handleShare = async () => {
        if (user?.referral_code) {
            await Share.share({
                message: `Use meu código ${user.referral_code} no DUNNAA e ganhe desconto! https://dunnaa.app/r/${user.referral_code}`,
            });
        }
    };

    const handleLogout = () => {
        Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/');
                },
            },
        ]);
    };

    return (
        <ScrollView
            style={[styles.container, { paddingTop: insets.top + spacing.lg }]}
            contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
            showsVerticalScrollIndicator={false}
        >
            {/* User Info */}
            <View style={styles.userSection}>
                {isAuthenticated ? (
                    <>
                        {user?.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarLetter}>{(user?.name || 'U')[0].toUpperCase()}</Text>
                            </View>
                        )}
                        <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
                        <Text style={styles.userPhone}>{user?.phone}</Text>
                        {user?.email ? (
                            <Text style={styles.userEmail}>{user.email}</Text>
                        ) : null}
                    </>
                ) : (
                    <>
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person-outline" size={36} color={colors.white} />
                        </View>
                        <Text style={styles.userName}>Modo visitante</Text>
                        <Text style={styles.userPhone}>Entre para agendar, fila e pagamentos</Text>
                        <TouchableOpacity
                            style={styles.loginBtn}
                            onPress={() => router.push('/(auth)/login')}
                        >
                            <Text style={styles.loginBtnText}>Entrar ou criar conta</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Referral Card */}
            {user?.referral_code && (
                <TouchableOpacity style={styles.referralCard} onPress={handleShare} activeOpacity={0.8}>
                    <View style={styles.referralLeft}>
                        <Ionicons name="gift-outline" size={24} color={colors.primary} />
                        <View>
                            <Text style={styles.referralTitle}>Indique e ganhe!</Text>
                            <Text style={styles.referralCode}>Código: {user.referral_code}</Text>
                        </View>
                    </View>
                    <Ionicons name="share-social-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
            )}

            {/* Menu */}
            <View style={styles.menuCard}>
                {menuItems.map((item, i) => (
                    <TouchableOpacity
                        key={item.label}
                        style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
                        onPress={() => {
                            if (item.route) requireLogin(item.route);
                        }}
                    >
                        <View style={styles.menuLeft}>
                            <Ionicons name={item.icon as any} size={22} color={colors.textSecondary} />
                            <Text style={styles.menuLabel}>{item.label}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Logout */}
            {isAuthenticated && (
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                    <Text style={styles.logoutText}>Sair da conta</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.version}>DUNNAA v1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
    userSection: { alignItems: 'center', marginBottom: spacing['2xl'] },
    avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: spacing.md },
    avatarPlaceholder: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: { fontSize: 32, fontWeight: '700', color: colors.white },
    userName: { ...typography.h3, color: colors.textMain },
    userPhone: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
    userEmail: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
    loginBtn: {
        marginTop: spacing.lg, backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.xl,
    },
    loginBtnText: { ...typography.button, color: colors.white },
    referralCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.primary + '08',
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.primary + '20',
    },
    referralLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    referralTitle: { ...typography.bodySmMedium, color: colors.primary },
    referralCode: { ...typography.caption, color: colors.textMuted },
    menuCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        ...shadow.sm,
        marginBottom: spacing.xl,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    menuLabel: { ...typography.body, color: colors.textMain },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
    },
    logoutText: { ...typography.bodyMedium, color: colors.error },
    version: {
        ...typography.caption,
        color: colors.textLight,
        textAlign: 'center',
        marginTop: spacing.lg,
    },
});
