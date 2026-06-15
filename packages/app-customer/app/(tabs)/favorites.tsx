/**
 * Favorites screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EstablishmentCard } from '../../src/components/EstablishmentCard';
import { EmptyState } from '../../src/components/EmptyState';
import { favoritesService } from '../../src/services/favorites';
import type { Establishment } from '../../src/services/establishments';
import { colors, typography, spacing } from '../../src/theme';
import { useTabBarPadding } from '../../src/hooks/useTabBarPadding';

export default function Favorites() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const tabBarPadding = useTabBarPadding();
    const [favorites, setFavorites] = useState<Establishment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const list = await favoritesService.list();
            setFavorites(list);
        } catch (error) {
            setFavorites([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
            <Text style={styles.pageTitle}>Favoritos</Text>
            <FlatList
                data={favorites}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.list, { paddingBottom: tabBarPadding }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} colors={[colors.primary]} />}
                renderItem={({ item }) => (
                    <EstablishmentCard
                        establishment={item}
                        onPress={() => router.push(`/establishment/${item.id}`)}
                    />
                )}
                ListEmptyComponent={
                    !isLoading ? (
                        <EmptyState
                            icon="heart-outline"
                            title="Sem favoritos"
                            subtitle="Favorite estabelecimentos para acessar rapidamente."
                        />
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    pageTitle: { ...typography.h2, color: colors.textMain, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
    list: { paddingHorizontal: spacing.xl },
});
