import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../src/theme';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                tabBarStyle: { height: 64, paddingBottom: 8 },
                tabBarLabelStyle: typography.caption,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Início',
                    tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="appointments"
                options={{
                    title: 'Agenda',
                    tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="queue"
                options={{
                    title: 'Fila',
                    tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="destaque"
                options={{
                    title: 'Destaque',
                    tabBarIcon: ({ color, size }) => <Ionicons name="flash-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Alertas',
                    tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="finance"
                options={{
                    title: 'Financeiro',
                    tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
