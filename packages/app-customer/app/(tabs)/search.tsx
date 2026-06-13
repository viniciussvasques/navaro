/**
 * Search / Results screen with Map/List toggle, filters and map bottom sheet
 */
import React, { useState, useEffect, useCallback, ComponentType } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
    Platform,
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
import { MapEstablishmentSheet } from '../../src/components/MapEstablishmentSheet';
import { establishmentService, Establishment, SearchParams } from '../../src/services/establishments';
import { colors, typography, spacing, radius } from '../../src/theme';

type SortOption = 'distance' | 'rating' | 'price';
type ViewMode = 'list' | 'map';

let MapViewComponent: ComponentType<any> | null = null;
let MarkerComponent: ComponentType<any> | null = null;
try {
    const maps = require('react-native-maps');
    MapViewComponent = maps.default;
    MarkerComponent = maps.Marker;
} catch {
    // map unavailable
}

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

export default function Search() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ q?: string }>();
    const { coords, city, permissionGranted } = useLocation();

    const [query, setQuery] = useState(params.q || '');
    const [results, setResults] = useState<Establishment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>(permissionGranted ? 'distance' : 'rating');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedMapEst, setSelectedMapEst] = useState<Establishment | null>(null);

    const mapAvailable = MapViewComponent != null && MarkerComponent != null;
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

    const initialRegion = {
        latitude: coords?.latitude || -23.5505,
        longitude: coords?.longitude || -46.6333,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
    };

    const mappableResults = results.filter((r) => r.latitude != null && r.longitude != null);

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

                {mapAvailable && (
                    <TouchableOpacity
                        style={[styles.viewToggle, viewMode === 'map' && styles.viewToggleActive]}
                        onPress={() => {
                            setSelectedMapEst(null);
                            setViewMode(viewMode === 'list' ? 'map' : 'list');
                        }}
                    >
                        <Ionicons
                            name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
                            size={18}
                            color={viewMode === 'map' ? colors.white : colors.primary}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {viewMode === 'map' && mapAvailable && MapViewComponent && MarkerComponent ? (
                <View style={styles.mapContainer}>
                    <MapViewComponent
                        style={styles.map}
                        initialRegion={initialRegion}
                        showsUserLocation={permissionGranted}
                        showsMyLocationButton
                        onPress={() => setSelectedMapEst(null)}
                    >
                        {mappableResults.map((est) => (
                            <MarkerComponent
                                key={est.id}
                                coordinate={{
                                    latitude: est.latitude!,
                                    longitude: est.longitude!,
                                }}
                                title={est.is_sponsored ? `⚡ ${est.name}` : est.name}
                                description={est.address}
                                pinColor={est.is_sponsored ? colors.star : colors.primary}
                                onPress={() => setSelectedMapEst(est)}
                            />
                        ))}
                    </MapViewComponent>

                    <View style={styles.mapBadge}>
                        <Ionicons name="location" size={14} color={colors.primary} />
                        <Text style={styles.mapBadgeText}>
                            {mappableResults.length} {mappableResults.length === 1 ? 'local' : 'locais'}
                            {results.some((r) => r.is_sponsored) ? ' · ⚡ destaques' : ''}
                        </Text>
                    </View>

                    {isLoading && (
                        <View style={styles.mapLoading}>
                            <ActivityIndicator color={colors.primary} size="small" />
                        </View>
                    )}

                    <MapEstablishmentSheet
                        establishment={selectedMapEst}
                        onClose={() => setSelectedMapEst(null)}
                        onOpen={(id) => router.push(`/establishment/${id}`)}
                    />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
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
            )}

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
    viewToggle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing['3xl'] },
    loader: { paddingVertical: spacing.xl },
    mapContainer: { flex: 1, position: 'relative' },
    map: { flex: 1 },
    mapBadge: {
        position: 'absolute',
        top: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.white,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 4 },
        }),
    },
    mapBadgeText: { fontSize: 12, fontWeight: '600', color: colors.textMain },
    mapLoading: { position: 'absolute', top: 60, alignSelf: 'center' },
});
