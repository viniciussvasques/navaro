/**
 * Onboarding screen — 3 slides
 */
import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, typography, spacing, radius } from '../../src/theme';

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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFinishing, setIsFinishing] = useState(false);

    const slide = slides[currentIndex];

    const finish = async (asGuest = false) => {
        if (isFinishing) return;
        setIsFinishing(true);
        try {
            await completeOnboarding();
            router.replace(asGuest ? '/(tabs)' : '/(auth)/login');
        } finally {
            setIsFinishing(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex((index) => index + 1);
            return;
        }
        void finish(false);
    };

    const handleSkip = () => {
        void finish(true);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={isFinishing}>
                <Text style={styles.skipText}>Pular</Text>
            </TouchableOpacity>

            <View style={styles.slide}>
                <View style={[styles.iconCircle, { backgroundColor: slide.color + '15' }]}>
                    <Ionicons name={slide.icon} size={64} color={slide.color} />
                </View>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>

            <View style={styles.dots}>
                {slides.map((_, i) => (
                    <View
                        key={i}
                        style={[styles.dot, currentIndex === i && styles.dotActive]}
                    />
                ))}
            </View>

            <TouchableOpacity
                style={[styles.button, isFinishing && styles.buttonDisabled]}
                onPress={handleNext}
                disabled={isFinishing}
                activeOpacity={0.8}
                // Web: garante clique mesmo com overflow:hidden do expo-reset
                {...(Platform.OS === 'web' ? { role: 'button' as const } : {})}
            >
                <Text style={styles.buttonText}>
                    {currentIndex === slides.length - 1 ? 'Entrar' : 'Próximo'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>

            {currentIndex === slides.length - 1 && (
                <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={() => void finish(true)}
                    disabled={isFinishing}
                >
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
        zIndex: 2,
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
        minHeight: 280,
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
        zIndex: 2,
        ...(Platform.OS === 'web'
            ? { cursor: 'pointer' as const }
            : {}),
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        ...typography.button,
        color: colors.white,
    },
    guestBtn: {
        alignItems: 'center',
        paddingVertical: spacing.md,
        marginBottom: spacing.xl,
        zIndex: 2,
        ...(Platform.OS === 'web'
            ? { cursor: 'pointer' as const }
            : {}),
    },
    guestText: {
        ...typography.bodySmMedium,
        color: colors.primary,
    },
});
