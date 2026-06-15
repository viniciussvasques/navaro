/**
 * Saved payment cards
 */
import React, { useCallback, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { cardsService, SavedCard, CardType } from '../../src/services/cards';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

function brandIcon(brand: string): keyof typeof Ionicons.glyphMap {
    return 'card-outline';
}

export default function CardsScreen() {
    const insets = useSafeAreaInsets();
    const [cards, setCards] = useState<SavedCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [holder, setHolder] = useState('');
    const [number, setNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [type, setType] = useState<CardType>('credit');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setCards(await cardsService.list());
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const formatCardNumber = (text: string) => {
        const digits = text.replace(/\D/g, '').slice(0, 16);
        return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    };

    const formatExpiry = (text: string) => {
        const digits = text.replace(/\D/g, '').slice(0, 4);
        if (digits.length <= 2) return digits;
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    };

    const handleSave = async () => {
        const digits = number.replace(/\D/g, '');
        const [mm, yy] = expiry.split('/');
        const expMonth = Number.parseInt(mm || '0', 10);
        const expYear = Number.parseInt(yy || '0', 10) + 2000;

        if (!holder.trim() || digits.length < 13 || !mm || !yy || cvv.length < 3) {
            Alert.alert('Dados incompletos', 'Preencha nome, número, validade e CVV.');
            return;
        }

        setSaving(true);
        try {
            await cardsService.save({
                holder_name: holder.trim(),
                number: digits,
                exp_month: expMonth,
                exp_year: expYear,
                cvv,
                type,
            });
            setShowForm(false);
            setHolder('');
            setNumber('');
            setExpiry('');
            setCvv('');
            await load();
            Alert.alert('Cartão salvo', 'Seu cartão foi cadastrado com sucesso.');
        } catch {
            Alert.alert('Erro', 'Não foi possível salvar o cartão.');
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = (card: SavedCard) => {
        Alert.alert('Remover cartão', `Remover ${card.brand} •••• ${card.last4}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover',
                style: 'destructive',
                onPress: async () => {
                    await cardsService.remove(card.id);
                    await load();
                },
            },
        ]);
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Header title="Meus cartões" showBack />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : (
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <FlatList
                        data={cards}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                        ListHeaderComponent={
                            <>
                                <View style={styles.infoCard}>
                                    <Ionicons name="shield-checkmark-outline" size={22} color={colors.accent} />
                                    <Text style={styles.infoText}>
                                        Pagamentos processados com segurança via Mercado Pago. Armazenamos apenas os últimos 4 dígitos.
                                    </Text>
                                </View>
                                {!showForm && (
                                    <TouchableOpacity
                                        style={styles.addBtn}
                                        onPress={() => setShowForm(true)}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="add-circle-outline" size={22} color={colors.white} />
                                        <Text style={styles.addBtnText}>Cadastrar cartão</Text>
                                    </TouchableOpacity>
                                )}
                                {showForm && (
                                    <View style={styles.formCard}>
                                        <Text style={styles.formTitle}>Novo cartão</Text>
                                        <View style={styles.typeRow}>
                                            {(['credit', 'debit'] as CardType[]).map((t) => (
                                                <TouchableOpacity
                                                    key={t}
                                                    style={[styles.typeChip, type === t && styles.typeChipActive]}
                                                    onPress={() => setType(t)}
                                                >
                                                    <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                                                        {t === 'credit' ? 'Crédito' : 'Débito'}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <TextInput style={styles.input} placeholder="Nome no cartão" value={holder} onChangeText={setHolder} placeholderTextColor={colors.textLight} />
                                        <TextInput style={styles.input} placeholder="Número do cartão" value={number} onChangeText={(t) => setNumber(formatCardNumber(t))} keyboardType="number-pad" placeholderTextColor={colors.textLight} />
                                        <View style={styles.row}>
                                            <TextInput
                                                style={[styles.input, styles.expiryInput]}
                                                placeholder="MM/AA"
                                                value={expiry}
                                                onChangeText={(t) => setExpiry(formatExpiry(t))}
                                                keyboardType="number-pad"
                                                placeholderTextColor={colors.textLight}
                                            />
                                            <TextInput
                                                style={[styles.input, styles.cvvInput]}
                                                placeholder="CVV"
                                                value={cvv}
                                                onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                                                keyboardType="number-pad"
                                                secureTextEntry
                                                placeholderTextColor={colors.textLight}
                                            />
                                        </View>
                                        <View style={styles.formActions}>
                                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                                                {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </>
                        }
                        renderItem={({ item }) => (
                            <View style={styles.cardItem}>
                                <View style={styles.cardIcon}>
                                    <Ionicons name={brandIcon(item.brand)} size={24} color={colors.accent} />
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardBrand}>{item.brand} •••• {item.last4}</Text>
                                    <Text style={styles.cardMeta}>
                                        {item.holder_name} · {item.type === 'credit' ? 'Crédito' : 'Débito'} · {String(item.exp_month).padStart(2, '0')}/{String(item.exp_year).slice(-2)}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={12}>
                                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={
                            !showForm ? (
                                <View style={styles.empty}>
                                    <Ionicons name="card-outline" size={48} color={colors.border} />
                                    <Text style={styles.emptyTitle}>Nenhum cartão cadastrado</Text>
                                    <Text style={styles.emptySub}>Cadastre um cartão para pagar agendamentos mais rápido.</Text>
                                </View>
                            ) : null
                        }
                    />
                </KeyboardAvoidingView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: spacing.xl, paddingBottom: spacing['3xl'] },
    infoCard: {
        flexDirection: 'row',
        gap: spacing.md,
        backgroundColor: colors.primary + '08',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.accent + '33',
    },
    infoText: { ...typography.bodySm, color: colors.textSecondary, flex: 1, lineHeight: 20 },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: radius.xl,
        paddingVertical: spacing.lg,
        marginBottom: spacing.lg,
        ...shadow.md,
    },
    addBtnText: { ...typography.button, color: colors.white },
    formCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        overflow: 'hidden',
        ...shadow.sm,
    },
    formTitle: { ...typography.h4, color: colors.textMain, marginBottom: spacing.md },
    typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    typeChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
    },
    typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeChipText: { ...typography.bodySmMedium, color: colors.textSecondary },
    typeChipTextActive: { color: colors.white },
    input: {
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        ...typography.body,
        color: colors.textMain,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.sm,
        width: '100%',
    },
    expiryInput: {
        flex: 1,
        minWidth: 0,
    },
    cvvInput: {
        width: Platform.OS === 'web' ? 100 : 96,
        flexGrow: 0,
        flexShrink: 0,
    },
    formActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
    cancelBtnText: { ...typography.bodyMedium, color: colors.textMuted },
    saveBtn: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    saveBtnText: { ...typography.buttonSm, color: colors.white },
    cardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        ...shadow.sm,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    cardInfo: { flex: 1 },
    cardBrand: { ...typography.bodyMedium, color: colors.textMain },
    cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    empty: { alignItems: 'center', paddingTop: spacing['3xl'] },
    emptyTitle: { ...typography.bodyMedium, color: colors.textMuted, marginTop: spacing.lg },
    emptySub: { ...typography.caption, color: colors.textLight, marginTop: spacing.xs, textAlign: 'center' },
});
