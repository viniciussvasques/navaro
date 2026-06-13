import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function AppointmentLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.surface },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="[id]" />
        </Stack>
    );
}
