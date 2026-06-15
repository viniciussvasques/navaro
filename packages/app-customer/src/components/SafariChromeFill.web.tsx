import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafariToolbarOffset } from '../hooks/useWebBottomInset';
import { useIsStandalonePwa } from '../hooks/useIsStandalonePwa';
import { colors } from '../theme';

/** Preenche a faixa acima da barra do Safari com a cor do menu (evita vão branco). */
export function SafariChromeFill() {
    const offset = useSafariToolbarOffset();
    const isStandalone = useIsStandalonePwa();

    if (isStandalone || offset <= 0) return null;

    return <View pointerEvents="none" style={[styles.fill, { height: offset }]} />;
}

const styles = StyleSheet.create({
    fill: {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.surface,
        zIndex: 98,
    },
});
