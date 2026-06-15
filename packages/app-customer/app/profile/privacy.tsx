import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { LegalDocument } from '../../src/components/LegalDocument';
import { PRIVACY_SECTIONS, LEGAL_UPDATED_AT } from '../../src/content/legal';
import { colors } from '../../src/theme';

export default function Privacy() {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="Privacidade" showBack />
            <LegalDocument
                title="Política de Privacidade"
                updatedAt={LEGAL_UPDATED_AT}
                sections={PRIVACY_SECTIONS}
                bottomInset={insets.bottom + 24}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
});
