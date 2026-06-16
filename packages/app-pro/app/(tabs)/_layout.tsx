import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../../src/theme';
import { Platform } from 'react-native';

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const tabBarHeight = 56 + (Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 4));

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                tabBarStyle: {
                    height: tabBarHeight,
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 6),
                    paddingTop: 6,
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    elevation: 8,
                },
                tabBarLabelStyle: {
                    ...typography.caption,
                    fontSize: 11,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Início',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="appointments"
                options={{
                    title: 'Agenda',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="queue"
                options={{
                    title: 'Fila',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="finance"
                options={{
                    title: 'Financeiro',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="wallet-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={size} color={color} />
                    ),
                }}
            />
            {/* Tabs secundárias — ocultas da barra mas acessíveis por link */}
            <Tabs.Screen
                name="destaque"
                options={{
                    href: null,
                    title: 'Destaque',
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    href: null,
                    title: 'Alertas',
                }}
            />
        </Tabs>
    );
}
