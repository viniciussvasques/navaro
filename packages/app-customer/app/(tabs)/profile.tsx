/**
 * Profile screen
 */
import React from 'react';
import {
    View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Alert, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';
import { useTabBarPadding } from '../../src/hooks/useTabBarPadding';

type MenuItem = {
    icon: string;
    label: string;
    route: string;
    public?: boolean;
};

const accountItems: MenuItem[] = [
    { icon: 'person-outline', label: 'Editar perfil', route: '/profile/edit' },
    { icon: 'card-outline', label: 'Meus cartões', route: '/profile/cards' },
    { icon: 'wallet-outline', label: 'Carteira', route: '/profile/wallet' },
    { icon: 'receipt-outline', label: 'Meus pagamentos', route: '/profile/payments' },
    { icon: 'card-outline', label: 'Minhas assinaturas', route: '/profile/subscriptions' },
    { icon: 'notifications-outline', label: 'Notificações', route: '/notifications' },
    { icon: 'heart-outline', label: 'Favoritos', route: '/(tabs)/favorites' },
];

const businessItems: MenuItem[] = [
    { icon: 'diamond-outline', label: 'Destaques & parcerias', route: '/profile/promote', public: true },
];

const supportItems: MenuItem[] = [
    { icon: 'help-circle-outline', label: 'Ajuda e suporte', route: '/profile/help' },
];

const legalItems: MenuItem[] = [
    { icon: 'document-text-outline', label: 'Termos de uso', route: '/profile/terms', public: true },
    { icon: 'shield-outline', label: 'Privacidade', route: '/profile/privacy', public: true },
];

const appVersion = Constants.expoConfig?.version ?? '1.0.1';

function MenuSection({
    title,
    items,
    onPressItem,
}: {
    title: string;
    items: MenuItem[];
    onPressItem: (item: MenuItem) => void;
}) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{title}</Text>
            <View style={styles.menuCard}>
                {items.map((item, i) => (
                    <TouchableOpacity
                        key={item.label}
                        style={[styles.menuItem, i < items.length - 1 && styles.menuItemBorder]}
                        onPress={() => onPressItem(item)}
                        activeOpacity={0.75}
                    >
                        <View style={styles.menuLeft}>
                            <View style={styles.menuIconWrap}>
                                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

export default function Profile() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const tabBarPadding = useTabBarPadding();
    const { user, logout, isAuthenticated } = useAuth();

    const navigate = (item: MenuItem) => {
        if (item.public) {
            router.push(item.route as any);
            return;
        }
        if (!isAuthenticated) {
            router.push('/(auth)/login');
            return;
        }
        router.push(item.route as any);
    };

    const handleShare = async () => {
        if (user?.referral_code) {
            await Share.share({
                message: `Use meu código ${user.referral_code} no DUNNAA e ganhe desconto! https://dunnaa.com.br/r/${user.referral_code}`,
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
            contentContainerStyle={{ paddingBottom: tabBarPadding }}
            showsVerticalScrollIndicator={false}
        >
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
                            activeOpacity={0.85}
                        >
                            <Text style={styles.loginBtnText}>Entrar ou criar conta</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {user?.referral_code && (
                <TouchableOpacity style={styles.referralCard} onPress={handleShare} activeOpacity={0.85}>
                    <View style={styles.referralLeft}>
                        <View style={styles.referralIcon}>
                            <Ionicons name="gift-outline" size={22} color={colors.accentDark} />
                        </View>
                        <View>
                            <Text style={styles.referralTitle}>Indique e ganhe</Text>
                            <Text style={styles.referralCode}>Código: {user.referral_code}</Text>
                        </View>
                    </View>
                    <Ionicons name="share-social-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
            )}

            <MenuSection title="Conta" items={accountItems} onPressItem={navigate} />
            <MenuSection title="Negócios" items={businessItems} onPressItem={navigate} />
            <MenuSection title="Suporte" items={supportItems} onPressItem={navigate} />
            <MenuSection title="Legal e privacidade" items={legalItems} onPressItem={navigate} />

            {isAuthenticated && (
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                    <Text style={styles.logoutText}>Sair da conta</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.version}>DUNNAA v{appVersion}</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
    userSection: { alignItems: 'center', marginBottom: spacing['2xl'] },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        marginBottom: spacing.md,
        borderWidth: 3,
        borderColor: colors.accent + '44',
    },
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
        marginTop: spacing.lg,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.xl,
        ...shadow.md,
    },
    loginBtnText: { ...typography.button, color: colors.white },
    referralCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.accent + '33',
        ...shadow.sm,
    },
    referralLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    referralIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accentLight + '55',
        alignItems: 'center',
        justifyContent: 'center',
    },
    referralTitle: { ...typography.bodySmMedium, color: colors.textMain },
    referralCode: { ...typography.caption, color: colors.textMuted },
    section: { marginBottom: spacing.lg },
    sectionLabel: {
        ...typography.captionMedium,
        color: colors.textMuted,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    menuCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        ...shadow.sm,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    menuIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
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
