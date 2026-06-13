/**
 * Establishment detail screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, Image, TouchableOpacity,
    StyleSheet, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { RatingStars } from '../../src/components/RatingStars';
import { BusinessHours } from '../../src/components/BusinessHours';
import { ServiceItem } from '../../src/components/ServiceItem';
import { StaffCard } from '../../src/components/StaffCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import {
    establishmentService,
    Establishment,
    Service,
    StaffMember,
    Review,
} from '../../src/services/establishments';
import { favoritesService } from '../../src/services/favorites';
import { subscriptionService, SubscriptionPlan } from '../../src/services/subscriptions';
import { paymentsService } from '../../src/services/payments';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLocation } from '../../src/contexts/LocationContext';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';
import api from '../../src/services/api';

export default function EstablishmentDetail() {
    const { id, auto_favorite } = useLocalSearchParams<{ id: string; auto_favorite?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isAuthenticated } = useAuth();
    const { coords, city: userCity } = useLocation();

    const [est, setEst] = useState<Establishment | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isFavorite, setIsFavorite] = useState(false);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [todayAppointment, setTodayAppointment] = useState<{ id: string; service_name?: string; scheduled_at: string } | null>(null);
    const [checkinLoading, setCheckinLoading] = useState(false);
    const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
    const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
    const [mpEnabled, setMpEnabled] = useState(false);

    const load = useCallback(async () => {
        try {
            const [estRes, svcRes, staffRes, revRes] = await Promise.all([
                establishmentService.getById(id!, {
                    trackClick: true,
                    lat: coords?.latitude,
                    lng: coords?.longitude,
                    city: userCity ?? undefined,
                }),
                establishmentService.getServices(id!),
                establishmentService.getStaff(id!),
                establishmentService.getReviews(id!),
            ]);
            setEst(estRes.data);
            setServices(svcRes.data || []);
            setStaff(staffRes.data || []);
            setReviews(revRes.data?.items || []);

            try {
                const plansRes = await subscriptionService.listPlans(id!);
                setSubscriptionPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
            } catch {
                setSubscriptionPlans([]);
            }

            try {
                const { data: payCfg } = await paymentsService.getConfig();
                setMpEnabled(!!payCfg.mercadopago_enabled);
            } catch {
                setMpEnabled(false);
            }

            if (isAuthenticated) {
                try {
                    const favRes = await favoritesService.check(id!);
                    if (favRes.data.is_favorite) {
                        setIsFavorite(true);
                    } else if (auto_favorite === 'true') {
                        // Auto-favorite from QR code scan
                        await favoritesService.add(id!);
                        setIsFavorite(true);
                    }
                } catch { /* ignore */ }
                // Agendamento de hoje para check-in
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const { data: list } = await api.get(
                        `/appointments/my?date=${today}&establishment_id=${id}`
                    );
                    const items = Array.isArray(list) ? list : (list as any)?.items || [];
                    const next = items.find(
                        (a: any) => a.status === 'confirmed' || a.status === 'pending'
                    );
                    if (next) setTodayAppointment({ id: next.id, service_name: next.service_name, scheduled_at: next.scheduled_at });
                } catch { /* ignore */ }
            }
        } catch {
            Alert.alert('Erro', 'Não foi possível carregar os dados.');
            router.back();
        } finally {
            setIsLoading(false);
        }
    }, [id, isAuthenticated, auto_favorite, coords?.latitude, coords?.longitude, userCity]);

    useEffect(() => { load(); }, [load]);

    const toggleFavorite = async () => {
        if (!isAuthenticated) {
            router.push('/(auth)/login');
            return;
        }
        try {
            if (isFavorite) {
                await favoritesService.remove(id!);
            } else {
                await favoritesService.add(id!);
            }
            setIsFavorite(!isFavorite);
        } catch { /* ignore */ }
    };

    const toggleService = (serviceId: string) => {
        setSelectedServices((prev) =>
            prev.includes(serviceId)
                ? prev.filter((s) => s !== serviceId)
                : [...prev, serviceId]
        );
    };

    const totalPrice = services
        .filter((s) => selectedServices.includes(s.id))
        .reduce((sum, s) => sum + s.price, 0);

    const totalDuration = services
        .filter((s) => selectedServices.includes(s.id))
        .reduce((sum, s) => sum + s.duration_minutes, 0);

    const handleCheckin = async () => {
        if (!todayAppointment || checkinLoading) return;
        setCheckinLoading(true);
        try {
            await api.post(`/checkins/appointments/${todayAppointment.id}`);
            Alert.alert(
                'Check-in realizado!',
                'Aguarde ser chamado.',
                [{ text: 'OK' }]
            );
            setTodayAppointment(null);
        } catch (e: any) {
            const msg = e?.response?.data?.detail?.message || e?.response?.data?.detail;
            Alert.alert('Check-in', typeof msg === 'string' ? msg : 'Não foi possível fazer check-in.');
        } finally {
            setCheckinLoading(false);
        }
    };

    const handleBook = () => {
        if (!isAuthenticated) {
            router.push('/(auth)/login');
            return;
        }
        if (selectedServices.length === 0) {
            Alert.alert('Atenção', 'Selecione ao menos um serviço.');
            return;
        }
        router.push({
            pathname: '/establishment/book/staff',
            params: {
                establishmentId: id,
                serviceIds: selectedServices.join(','),
                totalPrice: String(totalPrice),
                totalDuration: String(totalDuration),
                establishmentName: est?.name,
            },
        });
    };

    const handleSubscribe = async (planId: string, planName: string, price: number) => {
        if (!isAuthenticated) {
            router.push('/(auth)/login');
            return;
        }

        const payWithWallet = async () => {
            setSubscribingPlanId(planId);
            try {
                await subscriptionService.subscribe(planId);
                Alert.alert('Sucesso!', 'Assinatura ativada. Veja em Perfil → Minhas assinaturas.');
            } catch (e: any) {
                const msg = e?.response?.data?.detail?.message || e?.response?.data?.detail;
                Alert.alert('Erro', typeof msg === 'string' ? msg : 'Não foi possível assinar.');
            } finally {
                setSubscribingPlanId(null);
            }
        };

        const payWithPix = async () => {
            setSubscribingPlanId(planId);
            try {
                const { data } = await subscriptionService.payIntent(planId);
                router.push({
                    pathname: '/establishment/book/payment',
                    params: {
                        appointmentId: '',
                        paymentId: data.provider_payment_id,
                        qrCode: data.qr_code || '',
                        qrCodeBase64: data.qr_code_base64 || '',
                        amount: String(data.amount),
                        establishmentName: est?.name || planName,
                        staffName: '',
                        date: '',
                        time: '',
                        totalDuration: '',
                        successRoute: '/profile/subscriptions',
                        paymentType: 'subscription',
                    },
                });
            } catch (e: any) {
                const msg = e?.response?.data?.detail?.message || e?.response?.data?.detail;
                Alert.alert('PIX', typeof msg === 'string' ? msg : 'Erro ao gerar PIX.');
            } finally {
                setSubscribingPlanId(null);
            }
        };

        const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
            { text: 'Cancelar', style: 'cancel' },
        ];
        if (mpEnabled) {
            buttons.unshift({ text: `PIX R$ ${price.toFixed(2)}`, onPress: payWithPix });
        }
        buttons.unshift({ text: 'Carteira DUNNAA', onPress: payWithWallet });

        Alert.alert(
            'Assinar plano',
            `Como deseja pagar "${planName}" (R$ ${price.toFixed(2)}/mês)?`,
            buttons
        );
    };

    if (isLoading) return <LoadingScreen />;
    if (!est) return null;

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Cover image */}
                {est.cover_url ? (
                    <Image source={{ uri: est.cover_url }} style={styles.cover} />
                ) : (
                    <View style={[styles.cover, styles.coverPlaceholder]}>
                        <Ionicons name="business" size={48} color={colors.textLight} />
                    </View>
                )}

                <Header
                    transparent
                    showBack
                    rightAction={
                        <TouchableOpacity onPress={toggleFavorite}>
                            <Ionicons
                                name={isFavorite ? 'heart' : 'heart-outline'}
                                size={24}
                                color={isFavorite ? colors.error : colors.white}
                            />
                        </TouchableOpacity>
                    }
                />

                {/* Info */}
                <View style={styles.infoSection}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{est.name}</Text>
                        {est.is_sponsored && (
                            <View style={styles.sponsoredBadge}>
                                <Text style={styles.sponsoredText}>Destaque</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.address}>{est.address}, {est.city}</Text>

                    {est.description ? (
                        <Text style={styles.description}>{est.description}</Text>
                    ) : null}

                    {(est.avg_rating != null) && (
                        <View style={styles.ratingRow}>
                            <RatingStars rating={est.avg_rating} count={est.review_count} />
                        </View>
                    )}

                    {/* Check-in hoje */}
                    {isAuthenticated && todayAppointment && (
                        <View style={styles.checkinCard}>
                            <View style={styles.checkinLeft}>
                                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                <View>
                                    <Text style={styles.checkinTitle}>Você tem agendamento hoje</Text>
                                    <Text style={styles.checkinSub}>
                                        {todayAppointment.service_name || 'Serviço'} •{' '}
                                        {new Date(todayAppointment.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.checkinBtn, checkinLoading && styles.checkinBtnDisabled]}
                                onPress={handleCheckin}
                                disabled={checkinLoading}
                            >
                                {checkinLoading ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <Text style={styles.checkinBtnText}>Fazer check-in</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Quick actions */}
                    <View style={styles.actionsRow}>
                        {est.phone && (
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => Linking.openURL(`tel:${est.phone}`)}
                            >
                                <Ionicons name="call-outline" size={20} color={colors.primary} />
                                <Text style={styles.actionLabel}>Ligar</Text>
                            </TouchableOpacity>
                        )}
                        {est.whatsapp && (
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => Linking.openURL(`https://wa.me/${est.whatsapp}`)}
                            >
                                <Ionicons name="logo-whatsapp" size={20} color={colors.successDark} />
                                <Text style={styles.actionLabel}>WhatsApp</Text>
                            </TouchableOpacity>
                        )}
                        {est.google_maps_url && (
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => Linking.openURL(est.google_maps_url!)}
                            >
                                <Ionicons name="navigate-outline" size={20} color={colors.secondary} />
                                <Text style={styles.actionLabel}>Mapa</Text>
                            </TouchableOpacity>
                        )}
                        {est.queue_mode_enabled && (
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => router.push(`/queue/${id}`)}
                            >
                                <Ionicons name="people-outline" size={20} color={colors.warning} />
                                <Text style={styles.actionLabel}>Fila</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Services */}
                <BusinessHours hours={est.business_hours} />
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Serviços</Text>
                    {services.filter((s) => s.active).map((svc) => (
                        <ServiceItem
                            key={svc.id}
                            service={svc}
                            selected={selectedServices.includes(svc.id)}
                            onToggle={() => toggleService(svc.id)}
                        />
                    ))}
                </View>

                {/* Staff */}
                {staff.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Equipe</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {staff.filter((s) => s.active).map((s) => (
                                <StaffCard key={s.id} staff={s} selected={false} onSelect={() => { }} />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Subscription plans */}
                {subscriptionPlans.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Planos de assinatura</Text>
                        <Text style={styles.sectionSub}>
                            Economize com visitas mensais fixas
                        </Text>
                        {subscriptionPlans.map((plan) => (
                            <View key={plan.id} style={styles.planCard}>
                                <View style={styles.planInfo}>
                                    <Text style={styles.planName}>{plan.name}</Text>
                                    {plan.description && (
                                        <Text style={styles.planDesc}>{plan.description}</Text>
                                    )}
                                    <Text style={styles.planPrice}>
                                        R$ {plan.price.toFixed(2)}<Text style={styles.planPeriod}>/mês</Text>
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.planBtn,
                                        subscribingPlanId === plan.id && styles.planBtnDisabled,
                                    ]}
                                    onPress={() => handleSubscribe(plan.id, plan.name, plan.price)}
                                    disabled={subscribingPlanId === plan.id}
                                >
                                    {subscribingPlanId === plan.id ? (
                                        <ActivityIndicator size="small" color={colors.white} />
                                    ) : (
                                        <Text style={styles.planBtnText}>Assinar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Reviews */}
                {reviews.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Avaliações</Text>
                        {reviews.slice(0, 3).map((rev) => (
                            <View key={rev.id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <Text style={styles.reviewUser}>{rev.user_name || 'Anônimo'}</Text>
                                    <RatingStars rating={rev.rating} size={14} showNumber={false} />
                                </View>
                                {rev.comment && <Text style={styles.reviewComment}>{rev.comment}</Text>}
                                <Text style={styles.reviewDate}>
                                    {new Date(rev.created_at).toLocaleDateString('pt-BR')}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom CTA */}
            {selectedServices.length > 0 && (
                <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
                    <View style={styles.bottomInfo}>
                        <Text style={styles.bottomLabel}>
                            {selectedServices.length} serviço{selectedServices.length > 1 ? 's' : ''} • {totalDuration} min
                        </Text>
                        <Text style={styles.bottomPrice}>R$ {totalPrice.toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity style={styles.bookBtn} onPress={handleBook} activeOpacity={0.8}>
                        <Text style={styles.bookBtnText}>Escolher profissional</Text>
                        <Ionicons name="arrow-forward" size={18} color={colors.white} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    cover: { width: '100%', height: 240 },
    coverPlaceholder: { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    infoSection: {
        backgroundColor: colors.surface,
        marginTop: -spacing['2xl'],
        marginHorizontal: spacing.lg,
        borderRadius: radius.xl,
        padding: spacing.xl,
        ...shadow.md,
    },
    name: { ...typography.h2, color: colors.textMain, flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
    sponsoredBadge: {
        backgroundColor: colors.warningLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.sm,
    },
    sponsoredText: { ...typography.captionMedium, color: colors.warning, fontWeight: '700' },
    description: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
    address: { ...typography.bodySm, color: colors.textMuted, marginTop: spacing.xs },
    ratingRow: { marginTop: spacing.md },
    checkinCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.primary + '12',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    checkinLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    checkinTitle: { ...typography.bodySmMedium, color: colors.textMain },
    checkinSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    checkinBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
    },
    checkinBtnDisabled: { opacity: 0.7 },
    checkinBtnText: { ...typography.buttonSm, color: colors.white },
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginTop: spacing.xl,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    actionBtn: { alignItems: 'center', gap: spacing.xs },
    actionLabel: { ...typography.caption, color: colors.textMuted },
    section: { paddingHorizontal: spacing.xl, marginTop: spacing['2xl'] },
    sectionTitle: { ...typography.h3, color: colors.textMain, marginBottom: spacing.lg },
    sectionSub: { ...typography.bodySm, color: colors.textMuted, marginTop: -spacing.md, marginBottom: spacing.lg },
    planCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.primary + '30',
        ...shadow.sm,
    },
    planInfo: { flex: 1, marginRight: spacing.md },
    planName: { ...typography.bodyMedium, color: colors.textMain },
    planDesc: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
    planPrice: { ...typography.price, color: colors.primary, marginTop: spacing.sm },
    planPeriod: { ...typography.caption, color: colors.textMuted },
    planBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        minWidth: 88,
        alignItems: 'center',
    },
    planBtnDisabled: { opacity: 0.7 },
    planBtnText: { ...typography.buttonSm, color: colors.white },
    reviewCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        ...shadow.sm,
    },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    reviewUser: { ...typography.bodySmMedium, color: colors.textMain },
    reviewComment: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.sm },
    reviewDate: { ...typography.caption, color: colors.textLight },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        ...shadow.lg,
    },
    bottomInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    bottomLabel: { ...typography.bodySm, color: colors.textMuted },
    bottomPrice: { ...typography.price, color: colors.primary },
    bookBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
    },
    bookBtnText: { ...typography.button, color: colors.white },
});
