/** Stub para export web — mapa nativo não disponível no PWA. */
import React from 'react';
import { View, ViewProps } from 'react-native';

function MapView(_props: ViewProps) {
    return React.createElement(View, null);
}

function Marker(_props: Record<string, unknown>) {
    return null;
}

export default MapView;
export { Marker };
export const PROVIDER_GOOGLE = 'google';
