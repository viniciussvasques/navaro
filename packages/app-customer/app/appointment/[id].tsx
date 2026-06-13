/**
 * Appointment detail — view and add products to upcoming appointment
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, RefreshControl, Modal, FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import api from '../../src/services/api';
import { appointmentService, Appointment, AppointmentProduct } from '../../src/services/appointments';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

type Product = { id: string; name: string; price: number; active: boolean };

export default function AppointmentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [addProductModal, setAddProductModal] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [addingProduct, setAddingProduct] = useState<string | null>(null);

    const loadAppointment = useCallback(async () => {
        if (!id) return;
        try {
            const { data } = await appointmentService.getById(id);
            setAppointment(data);
        } catch {
            setAppointment(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => { loadAppointment(); }, [loadAppointment]);

    const loadProducts = useCallback(async () => {
        if (!appointment?.establishment_id) return;
        setLoadingProducts(true);
        try {
            const { data } = await api.get(`/establishments/${appointment.establishment_id}/products`);
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            setProducts([]);
        } finally {
            setLoadingProducts(false);
        }
    }, [appointment?.establishment_id]);

    const openAddProduct = () => {
        setAddProductModal(true);
        loadProducts();
    };

    const handleCancel = () => {
        Alert.alert('Cancelar agendamento', 'Deseja cancelar este agendamento?', [
            { text: 'Não', style: 'cancel' },
            {
                text: 'Sim, cancelar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await appointmentService.cancel(id!);
                        Alert.alert('Cancelado', 'Seu agendamento foi cancelado.');
                        router.replace('/(tabs)/appointments');
                    } catch (e: any) {
                        const msg = e?.response?.data?.detail?.message ?? e?.response?.data?.detail ?? 'Não foi possível cancelar.';
                        Alert.alert('Erro', typeof msg === 'string' ? msg : 'Tente novamente.');
                    }
                },
            },
        ]);
    };

    const handleReschedule = () => {
        if (!appointment) return;
        router.push({
            pathname: '/establishment/book/time',
            params: {
                establishmentId: appointment.establishment_id,
                staffId: appointment.staff_id,
                serviceIds: appointment.service_id ?? '',
            },
        });
    };

    const addProductToAppointment = async (product: Product, quantity: number) => {
        if (!appointment || !id) return;
        setAddingProduct(product.id);
        try {
            const currentProducts: AppointmentProduct[] = appointment.products ?? [];
            const next = [
                ...currentProducts.map((p) => ({ product_id: p.product_id, quantity: p.quantity })),
                { product_id: product.id, quantity },
            ];
            await api.patch(`/appointments/${id}`, { products: next });
            await loadAppointment();
            setAddProductModal(false);
        } catch (e: any) {
            const msg = e?.response?.data?.detail?.message ?? e?.response?.data?.detail ?? 'Não foi possível adicionar o produto.';
            Alert.alert('Erro', typeof msg === 'string' ? msg : 'Tente novamente.');
        } finally {
            setAddingProduct(null);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
    };
    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const isUpcoming = appointment && ['pending', 'confirmed'].includes(appointment.status);
    const statusLabel: Record<string, string> = {
        pending: 'Pendente',
        confirmed: 'Confirmado',
        completed: 'Concluído',
        cancelled: 'Cancelado',
        no_show: 'Ausente',
    };

    if (loading || !id) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }
    if (!appointment) {
        return (
            <View style={styles.container}>
                <Header title="Agendamento" />
                <View style={styles.center}>
                    <Text style={styles.errorText}>Agendamento não encontrado.</Text>
                    <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                        <Text style={styles.backLinkText}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const existingProducts: AppointmentProduct[] = appointment.products ?? [];

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <Header title="Agendamento" />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppointment(); }} />
                }
            >
                <View style={styles.card}>
                    <Text style={styles.establishmentName}>{appointment.establishment_name ?? 'Estabelecimento'}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '18' }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>
                            {statusLabel[appointment.status] ?? appointment.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Row label="Serviço" value={appointment.service_name ?? 'Serviço'} />
                    <Row label="Data" value={formatDate(appointment.scheduled_at)} />
                    <Row label="Horário" value={formatTime(appointment.scheduled_at)} />
                    {appointment.staff_name && <Row label="Profissional" value={appointment.staff_name} />}
                </View>

                {existingProducts.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Produtos adicionados</Text>
                        {existingProducts.map((p) => (
                            <View key={p.product_id} style={styles.productRow}>
                                <Text style={styles.productName}>{p.name}</Text>
                                <Text style={styles.productQty}>x{p.quantity}</Text>
                                <Text style={styles.productPrice}>R$ {(p.unit_price * p.quantity).toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.card}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>R$ {Number(appointment.total_price ?? 0).toFixed(2)}</Text>
                    </View>
                </View>

                {isUpcoming && (
                    <>
                        <TouchableOpacity style={styles.addProductBtn} onPress={openAddProduct} activeOpacity={0.8}>
                            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                            <Text style={styles.addProductBtnText}>Adicionar produto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleReschedule}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            <Text style={styles.actionBtnText}>Reagendar horário</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                            <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                            <Text style={styles.cancelBtnText}>Cancelar agendamento</Text>
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)/appointments')}>
                    <Text style={styles.secondaryBtnText}>Ver todos os agendamentos</Text>
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={addProductModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Adicionar produto</Text>
                            <TouchableOpacity onPress={() => setAddProductModal(false)}>
                                <Ionicons name="close" size={28} color={colors.textMain} />
                            </TouchableOpacity>
                        </View>
                        {loadingProducts ? (
                            <ActivityIndicator style={{ marginVertical: spacing.xl }} color={colors.primary} />
                        ) : (
                            <FlatList
                                data={products}
                                keyExtractor={(p) => p.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.productItem}
                                        onPress={() => addProductToAppointment(item, 1)}
                                        disabled={addingProduct !== null}
                                    >
                                        <View style={styles.productItemInfo}>
                                            <Text style={styles.productItemName}>{item.name}</Text>
                                            <Text style={styles.productItemPrice}>R$ {Number(item.price).toFixed(2)}</Text>
                                        </View>
                                        {addingProduct === item.id ? (
                                            <ActivityIndicator size="small" color={colors.primary} />
                                        ) : (
                                            <Ionicons name="add-circle" size={24} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.emptyProducts}>Nenhum produto disponível.</Text>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.xl, paddingBottom: spacing['3xl'] },
    card: {
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        ...shadow.sm,
    },
    establishmentName: { ...typography.h3, color: colors.textMain, marginBottom: spacing.sm },
    badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg },
    badgeText: { ...typography.caption, fontWeight: '600' },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowLabel: { ...typography.bodySm, color: colors.textMuted },
    rowValue: { ...typography.bodySmMedium, color: colors.textMain },
    sectionTitle: { ...typography.bodySmMedium, color: colors.textMuted, marginBottom: spacing.md },
    productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    productName: { flex: 1, ...typography.bodySm, color: colors.textMain },
    productQty: { ...typography.caption, color: colors.textMuted, marginRight: spacing.sm },
    productPrice: { ...typography.bodySmMedium, color: colors.primary },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    totalLabel: { ...typography.h4, color: colors.textMain },
    totalValue: { ...typography.h2, color: colors.primary },
    addProductBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        marginBottom: spacing.lg,
    },
    addProductBtnText: { ...typography.button, color: colors.primary },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.primary + '12',
        marginBottom: spacing.md,
    },
    actionBtnText: { ...typography.button, color: colors.primary },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.error + '40',
        marginBottom: spacing.lg,
    },
    cancelBtnText: { ...typography.button, color: colors.error },
    secondaryBtn: { alignItems: 'center', paddingVertical: spacing.md },
    secondaryBtnText: { ...typography.bodySm, color: colors.textMuted },
    errorText: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
    backLink: { paddingVertical: spacing.sm },
    backLinkText: { ...typography.bodyMedium, color: colors.primary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], maxHeight: '80%', padding: spacing.xl },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    modalTitle: { ...typography.h3, color: colors.textMain },
    productItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    productItemInfo: { flex: 1 },
    productItemName: { ...typography.bodyMedium, color: colors.textMain },
    productItemPrice: { ...typography.bodySm, color: colors.primary, marginTop: 2 },
    emptyProducts: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing['2xl'] },
});
