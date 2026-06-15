/**
 * Profile stack layout — handles navigation for profile sub-screens
 */
import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function ProfileLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.surface },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="edit" />
            <Stack.Screen name="cards" />
            <Stack.Screen name="promote" />
            <Stack.Screen name="subscriptions" />
            <Stack.Screen name="wallet" />
            <Stack.Screen name="payments" />
            <Stack.Screen name="help" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="privacy" />
        </Stack>
    );
}
