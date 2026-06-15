/**
 * Home screen — Search-first experience
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, FlatList,
    RefreshControl, StyleSheet, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLocation } from '../../src/contexts/LocationContext';
import { SearchBar } from '../../src/components/SearchBar';
import { CategoryChip } from '../../src/components/CategoryChip';
import { EstablishmentCard } from '../../src/components/EstablishmentCard';
import { establishmentService, Establishment } from '../../src/services/establishments';
import { HOME_CATEGORIES } from '../../src/constants/categories';
import { useTabBarPadding } from '../../src/hooks/useTabBarPadding';
import { colors, typography, spacing, radius, shadow } from '../../src/theme';

const categories = HOME_CATEGORIES;

export default function Home() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const tabBarPadding = useTabBarPadding();
    const { user } = useAuth();
    const { city, state, coords, permissionGranted, isLoading: locationLoading, requestPermission } = useLocation();

    const locationLabel = locationLoading
        ? 'Buscando localização...'
        : city && state
            ? `${city} - ${state}`
            : coords
                ? 'Localização ativa'
                : 'Toque para permitir localização';

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [nearby, setNearby] = useState<Establishment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadNearby = useCallback(async () => {
        try {
            const params: any = {
                category: selectedCategory === 'all' ? undefined : selectedCategory,
                page_size: 30,
            };
            // Add geo params for sorting by distance, but NO radius limit
            if (coords?.latitude && coords?.longitude) {
                params.lat = coords.latitude;
                params.lng = coords.longitude;
                // No radius — show ALL establishments, sorted by distance
            }
            const { data } = await establishmentService.search(params);
            setNearby(data.items || []);
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [coords, selectedCategory]);

    useEffect(() => {
        loadNearby();
    }, [loadNearby]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/(tabs)/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadNearby();
    };

    const firstName = user?.name?.split(' ')[0] || 'visitante';

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: tabBarPadding }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <View style={styles.headerBar}>
                    <View style={styles.brandRow}>
                        <Image
                            source={require('../../assets/logo-d.png')}
                            style={styles.brandIcon}
                            resizeMode="contain"
                        />
                        <View>
                            <Text style={styles.brandName}>DUNNAA</Text>
                            <Text style={styles.brandTagline}>Beleza & bem-estar</Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/scan')}>
                            <Ionicons name="qr-code-outline" size={22} color={colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/notifications')}>
                            <Ionicons name="notifications-outline" size={22} color={colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.headerTop}>
                    <View style={styles.greetingBlock}>
                        <Text style={styles.greeting}>Olá, {firstName}</Text>
                        <TouchableOpacity style={styles.locationRow} onPress={() => void requestPermission()}>
                            <Ionicons name="location" size={16} color={colors.accent} />
                            <Text style={styles.locationText}>{locationLabel}</Text>
                            <Ionicons name="chevron-down" size={14} color={colors.accent} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmit={handleSearch}
                        onFilterPress={() => router.push('/(tabs)/search')}
                    />
                </View>
            </View>

            {/* Categories */}
            <View style={styles.section}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {categories.map((cat) => (
                        <CategoryChip
                            key={cat.key}
                            label={cat.label}
                            icon={cat.icon}
                            selected={selectedCategory === cat.key}
                            onPress={() => setSelectedCategory(cat.key)}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Em destaque */}
            {!isLoading && nearby.some((e) => e.is_sponsored) && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="flash-outline" size={20} color={colors.accent} />
                            <Text style={styles.sectionTitle}>Em destaque</Text>
                        </View>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                        {nearby.filter((e) => e.is_sponsored).slice(0, 8).map((est) => (
                            <View key={est.id} style={styles.featuredCard}>
                                <EstablishmentCard
                                    establishment={est}
                                    onPress={() => router.push(`/establishment/${est.id}`)}
                                    compact
                                />
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Perto de Você */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {permissionGranted ? 'Perto de você' : 'Populares'}
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                        <Text style={styles.seeAll}>Ver todos</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.loadingCards}>
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={styles.skeletonCard} />
                        ))}
                    </View>
                ) : nearby.length === 0 ? (
                    <View style={styles.emptyNearby}>
                        <Ionicons name="business-outline" size={40} color={colors.textLight} />
                        <Text style={styles.emptyText}>Nenhum estabelecimento encontrado.</Text>
                        {!coords && (
                            <TouchableOpacity style={styles.locationBtn} onPress={() => void requestPermission()}>
                                <Ionicons name="location" size={16} color={colors.white} />
                                <Text style={styles.locationBtnText}>Usar minha localização</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    nearby.map((est) => (
                        <EstablishmentCard
                            key={est.id}
                            establishment={est}
                            onPress={() => router.push(`/establishment/${est.id}`)}
                        />
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.primaryDark,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['3xl'],
        borderBottomLeftRadius: radius['2xl'],
        borderBottomRightRadius: radius['2xl'],
        borderBottomWidth: 1,
        borderBottomColor: colors.accent + '22',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    brandIcon: {
        width: 52,
        height: 52,
    },
    brandName: {
        ...typography.h3,
        color: colors.accent,
        letterSpacing: 1.2,
    },
    brandTagline: {
        ...typography.caption,
        color: colors.accentLight,
        marginTop: 2,
    },
    headerTop: {
        marginBottom: spacing.lg,
    },
    greetingBlock: {
        flex: 1,
    },
    greeting: {
        ...typography.h3,
        color: colors.white,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    locationText: {
        ...typography.bodySm,
        color: colors.accent,
    },
    headerActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    notifBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    searchContainer: {
        marginTop: spacing.sm,
    },
    section: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xl,
    },
    chipsRow: {
        paddingVertical: spacing.xs,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.textMain,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    seeAll: {
        ...typography.bodySmMedium,
        color: colors.primary,
    },
    featuredRow: {
        gap: spacing.md,
        paddingBottom: spacing.xs,
    },
    featuredCard: {
        width: 280,
    },
    loadingCards: {
        gap: spacing.lg,
    },
    skeletonCard: {
        height: 200,
        backgroundColor: colors.border,
        borderRadius: radius.xl,
    },
    emptyNearby: {
        alignItems: 'center',
        padding: spacing['3xl'],
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
    },
    emptyText: {
        ...typography.bodySm,
        color: colors.textMuted,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    locationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
    },
    locationBtnText: {
        ...typography.buttonSm,
        color: colors.white,
    },
});
