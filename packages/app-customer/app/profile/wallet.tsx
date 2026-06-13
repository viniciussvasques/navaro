/**
 * User Wallet screen
 */
import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import api from '../../src/services/api';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

type WalletTransaction = {
    id: string;
    type: string;
    amount: number;
    status: string;
    description?: string;
    created_at: string;
};

type Wallet = {
    id: string;
    balance: number;
    transactions: WalletTransaction[];
};

export default function WalletScreen() {
    const insets = useSafeAreaInsets();
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchWallet = async () => {
        try {
            const { data } = await api.get('/payments/wallet');
            setWallet(data);

            // Also fetch transactions
            try {
                const { data: txData } = await api.get('/payments/wallet/transactions');
                setWallet((prev) => prev ? { ...prev, transactions: txData } : null);
            } catch { /* No transactions */ }
        } catch {
            setWallet(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchWallet(); }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWallet();
    };

    const renderTransaction = ({ item }: { item: WalletTransaction }) => {
        const isCredit = item.type === 'credit' || item.type === 'cashback' || item.type === 'referral';
        return (
            <View style={styles.txCard}>
                <View style={[styles.txIcon, {
                    backgroundColor: isCredit ? '#10B98115' : '#EF444415',
                }]}>
                    <Ionicons
                        name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'}
                        size={22}
                        color={isCredit ? '#10B981' : '#EF4444'}
                    />
                </View>
                <View style={styles.txInfo}>
                    <Text style={styles.txType}>
                        {item.type === 'cashback' ? 'Cashback' :
                         item.type === 'referral' ? 'Bonus indicacao' :
                         item.type === 'credit' ? 'Credito' :
                         item.type === 'debit' ? 'Pagamento' : item.type}
                    </Text>
                    {item.description && (
                        <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
                    )}
                    <Text style={styles.txDate}>
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </Text>
                </View>
                <Text style={[styles.txAmount, { color: isCredit ? '#10B981' : '#EF4444' }]}>
                    {isCredit ? '+' : '-'}R$ {Math.abs(item.amount).toFixed(2)}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Header title="Carteira" />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={wallet?.transactions || []}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTransaction}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListHeaderComponent={
                        <View style={styles.balanceCard}>
                            <Text style={styles.balanceLabel}>Saldo disponivel</Text>
                            <Text style={styles.balanceValue}>
                                R$ {(wallet?.balance || 0).toFixed(2)}
                            </Text>
                            <Text style={styles.balanceSub}>
                                Use seu saldo para pagar agendamentos
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="wallet-outline" size={48} color={colors.border} />
                            <Text style={styles.emptyText}>
                                Nenhuma movimentacao ainda.
                            </Text>
                            <Text style={styles.emptySub}>
                                Cashback e bonus de indicacao aparecem aqui.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] },
    // Balance
    balanceCard: {
        alignItems: 'center', backgroundColor: colors.primary + '08',
        borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xl,
        borderWidth: 1, borderColor: colors.primary + '15',
    },
    balanceLabel: { ...typography.caption, color: colors.textMuted },
    balanceValue: { fontSize: 40, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
    balanceSub: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
    // Transactions
    txCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.background, borderRadius: radius.xl,
        padding: spacing.lg, marginBottom: spacing.sm,
    },
    txIcon: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    txInfo: { flex: 1 },
    txType: { ...typography.bodySmMedium, color: colors.textMain },
    txDesc: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
    txDate: { ...typography.caption, color: colors.textLight, marginTop: 2, fontSize: 10 },
    txAmount: { ...typography.bodyMedium, fontWeight: '700' },
    // Empty
    empty: { alignItems: 'center', paddingTop: spacing['3xl'] },
    emptyText: { ...typography.bodyMedium, color: colors.textMuted, marginTop: spacing.lg },
    emptySub: { ...typography.caption, color: colors.textLight, marginTop: spacing.xs },
});
