import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { LegalDocument } from '../../src/components/LegalDocument';
import { TERMS_SECTIONS, LEGAL_UPDATED_AT } from '../../src/content/legal';
import { colors } from '../../src/theme';

export default function Terms() {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="Termos de Uso" showBack />
            <LegalDocument
                title="Termos de Uso"
                updatedAt={LEGAL_UPDATED_AT}
                sections={TERMS_SECTIONS}
                bottomInset={insets.bottom + 24}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
});
