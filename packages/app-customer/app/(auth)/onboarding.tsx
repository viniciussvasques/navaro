/**
 * Onboarding screen — 3 slides
 */
import React, { useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Dimensions, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, typography, spacing, radius } from '../../src/theme';

const { width } = Dimensions.get('window');

const slides = [
    {
        icon: 'location-outline' as const,
        title: 'Agende perto de você',
        subtitle: 'Encontre barbearias, salões e spas na sua região com horários disponíveis.',
        color: colors.primary,
    },
    {
        icon: 'person-outline' as const,
        title: 'Escolha seu profissional',
        subtitle: 'Veja avaliações, especialidades e escolha quem vai te atender.',
        color: colors.secondary,
    },
    {
        icon: 'card-outline' as const,
        title: 'Pague no app ou no local',
        subtitle: 'Agende com segurança e pague como preferir. Simples e rápido.',
        color: colors.primaryDark,
    },
];

export default function Onboarding() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { completeOnboarding } = useAuth();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const finish = async (asGuest = false) => {
        await completeOnboarding();
        router.replace(asGuest ? '/(tabs)' : '/(auth)/login');
    };

    const handleNext = async () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            await finish(false);
        }
    };

    const handleSkip = async () => {
        await finish(true);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>Pular</Text>
            </TouchableOpacity>

            <FlatList
                ref={flatListRef}
                data={slides}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
                }}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width }]}>
                        <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
                            <Ionicons name={item.icon} size={64} color={item.color} />
                        </View>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.subtitle}>{item.subtitle}</Text>
                    </View>
                )}
                keyExtractor={(_, i) => String(i)}
            />

            {/* Dots */}
            <View style={styles.dots}>
                {slides.map((_, i) => (
                    <View
                        key={i}
                        style={[styles.dot, currentIndex === i && styles.dotActive]}
                    />
                ))}
            </View>

            {/* Button */}
            <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
                <Text style={styles.buttonText}>
                    {currentIndex === slides.length - 1 ? 'Entrar' : 'Próximo'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>

            {currentIndex === slides.length - 1 && (
                <TouchableOpacity style={styles.guestBtn} onPress={() => finish(true)}>
                    <Text style={styles.guestText}>Explorar sem login</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    skipBtn: {
        alignSelf: 'flex-end',
        padding: spacing.lg,
    },
    skipText: {
        ...typography.bodySmMedium,
        color: colors.textMuted,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['3xl'],
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing['3xl'],
    },
    title: {
        ...typography.h1,
        color: colors.textMain,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    subtitle: {
        ...typography.body,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 26,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing['3xl'],
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    dotActive: {
        width: 24,
        backgroundColor: colors.primary,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        marginHorizontal: spacing['2xl'],
        paddingVertical: spacing.lg,
        borderRadius: radius.xl,
        marginBottom: spacing.xl,
    },
    buttonText: {
        ...typography.button,
        color: colors.white,
    },
    guestBtn: {
        alignItems: 'center',
        paddingVertical: spacing.md,
        marginBottom: spacing.xl,
    },
    guestText: {
        ...typography.bodySmMedium,
        color: colors.primary,
    },
});
