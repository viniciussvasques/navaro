import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useEstablishment } from '../../src/contexts/EstablishmentContext';
import { colors, typography, spacing, radius } from '../../src/theme';

const MENU = [
    { label: 'Serviços', icon: 'cut-outline' as const, href: '/services' },
    { label: 'Equipe', icon: 'people-outline' as const, href: '/staff' },
    { label: 'Promoções', icon: 'pricetag-outline' as const, href: '/promotions' },
    { label: 'Destaque', icon: 'flash-outline' as const, href: '/(tabs)/destaque' },
    { label: 'Configurações', icon: 'settings-outline' as const, href: '/settings' },
];

export default function ProfileTab() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { establishments, selectedId } = useEstablishment();
    const current = establishments.find((e) => e.id === selectedId);

    const handleLogout = () => {
        Alert.alert('Sair', 'Deseja encerrar a sessão?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/(auth)/login');
                },
            },
        ]);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
            <Text style={styles.title}>Perfil</Text>
            <View style={styles.card}>
                <Text style={styles.name}>{user?.name || 'Profissional'}</Text>
                <Text style={styles.phone}>{user?.phone}</Text>
                {current && <Text style={styles.est}>{current.name}</Text>}
            </View>

            <Text style={styles.sectionTitle}>Gestão</Text>
            {MENU.map((item) => (
                <TouchableOpacity
                    key={item.href}
                    style={styles.menuItem}
                    onPress={() => router.push(item.href as any)}
                >
                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, paddingTop: spacing['3xl'] },
    title: { ...typography.h2, color: colors.textMain, marginBottom: spacing.xl },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.xl },
    name: { ...typography.h3, color: colors.textMain },
    phone: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
    est: { ...typography.bodySmMedium, color: colors.primary, marginTop: spacing.md },
    sectionTitle: { ...typography.captionMedium, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase' },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
    },
    menuLabel: { ...typography.bodyMedium, color: colors.textMain, flex: 1 },
    logoutBtn: {
        borderWidth: 1,
        borderColor: colors.error,
        borderRadius: radius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    logoutText: { ...typography.button, color: colors.error },
});
