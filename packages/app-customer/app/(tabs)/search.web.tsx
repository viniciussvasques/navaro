/**
 * Search screen — web (lista; mapa nativo indisponível no PWA)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '../../src/contexts/LocationContext';
import { SearchBar } from '../../src/components/SearchBar';
import { EstablishmentCard } from '../../src/components/EstablishmentCard';
import { EmptyState } from '../../src/components/EmptyState';
import {
    SearchFiltersModal,
    DEFAULT_FILTERS,
    type SearchFilters,
} from '../../src/components/SearchFiltersModal';
import { establishmentService, Establishment, SearchParams } from '../../src/services/establishments';
import { colors, typography, spacing, radius } from '../../src/theme';
import { useTabBarPadding } from '../../src/hooks/useTabBarPadding';

type SortOption = 'distance' | 'rating' | 'price';

const sortOptions: { key: SortOption; label: string; icon: string }[] = [
    { key: 'distance', label: 'Distância', icon: 'location-outline' },
    { key: 'rating', label: 'Avaliação', icon: 'star-outline' },
    { key: 'price', label: 'Preço', icon: 'pricetag-outline' },
];

function buildParams(
    query: string,
    sortBy: SortOption,
    filters: SearchFilters,
    coords: { latitude: number; longitude: number } | null,
    city: string | null,
    page: number,
): SearchParams {
    const params: SearchParams = {
        q: query || undefined,
        sort_by: sortBy,
        page,
        page_size: 30,
    };
    if (filters.category !== 'all') params.category = filters.category;
    if (filters.maxPrice != null) params.max_price = filters.maxPrice;
    if (filters.minRating != null) params.min_rating = filters.minRating;
    if (coords?.latitude && coords?.longitude) {
        params.lat = coords.latitude;
        params.lng = coords.longitude;
        if (filters.radiusKm != null) params.radius = filters.radiusKm;
    }
    if (city) params.city = city;
    return params;
}

export default function SearchWeb() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const tabBarPadding = useTabBarPadding();
    const params = useLocalSearchParams<{ q?: string }>();
    const { coords, city, permissionGranted } = useLocation();

    const [query, setQuery] = useState(params.q || '');
    const [results, setResults] = useState<Establishment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>(permissionGranted ? 'distance' : 'rating');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const filterCount = [
        filters.category !== 'all',
        filters.radiusKm != null,
        filters.maxPrice != null,
        filters.minRating != null,
    ].filter(Boolean).length;

    const runSearch = useCallback(
        async (targetPage: number, append: boolean) => {
            setIsLoading(true);
            try {
                const searchParams = buildParams(query, sortBy, filters, coords, city, targetPage);
                const { data } = await establishmentService.search(searchParams);
                const items = data.items || [];
                setResults((prev) => (append ? [...prev, ...items] : items));
                setPage(targetPage);
                setHasMore(items.length === 30);
            } catch {
                if (!append) setResults([]);
            } finally {
                setIsLoading(false);
            }
        },
        [query, sortBy, filters, coords, city],
    );

    useEffect(() => {
        runSearch(1, false);
    }, [sortBy, filters, coords?.latitude, coords?.longitude, city]);

    useEffect(() => {
        if (params.q !== undefined) {
            setQuery(params.q || '');
            runSearch(1, false);
        }
    }, [params.q]);

    const loadMore = () => {
        if (!isLoading && hasMore) {
            runSearch(page + 1, true);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
            <View style={styles.searchRow}>
                <SearchBar
                    value={query}
                    onChangeText={setQuery}
                    onSubmit={() => runSearch(1, false)}
                    onFilterPress={() => setFiltersOpen(true)}
                    placeholder="Buscar serviço ou local..."
                />
                {filterCount > 0 && (
                    <View style={styles.filterBadge}>
                        <Text style={styles.filterBadgeText}>{filterCount}</Text>
                    </View>
                )}
            </View>

            <View style={styles.sortRow}>
                <View style={styles.sortChips}>
                    {sortOptions.map((opt) => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
                            onPress={() => setSortBy(opt.key)}
                        >
                            <Ionicons
                                name={opt.icon as any}
                                size={14}
                                color={sortBy === opt.key ? colors.white : colors.textMuted}
                            />
                            <Text style={[styles.sortText, sortBy === opt.key && styles.sortTextActive]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.list, { paddingBottom: tabBarPadding }]}
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                renderItem={({ item }) => (
                    <EstablishmentCard
                        establishment={item}
                        onPress={() => router.push(`/establishment/${item.id}`)}
                    />
                )}
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon="search-outline"
                            title="Nenhum resultado"
                            subtitle="Tente outros termos ou ajuste os filtros."
                        />
                    ) : null
                }
                ListFooterComponent={
                    isLoading ? (
                        <ActivityIndicator color={colors.primary} style={styles.loader} />
                    ) : null
                }
            />

            <SearchFiltersModal
                visible={filtersOpen}
                filters={filters}
                onClose={() => setFiltersOpen(false)}
                onApply={setFilters}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchRow: { paddingHorizontal: spacing.xl, marginBottom: spacing.md, position: 'relative' },
    filterBadge: {
        position: 'absolute',
        right: spacing.xl + 8,
        top: -4,
        backgroundColor: colors.warning,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
    sortRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
        marginBottom: spacing.md,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sortChips: { flexDirection: 'row', gap: spacing.sm, flex: 1 },
    sortChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    sortText: { ...typography.caption, color: colors.textMuted },
    sortTextActive: { color: colors.white },
    list: { paddingHorizontal: spacing.xl },
    loader: { paddingVertical: spacing.xl },
});
