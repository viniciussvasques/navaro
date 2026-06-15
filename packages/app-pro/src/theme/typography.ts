import { TextStyle } from 'react-native';

export const fontFamily = {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
} as const;

export const typography: Record<string, TextStyle> = {
    h1: { fontWeight: '700', fontSize: 32, lineHeight: 40 },
    h2: { fontWeight: '700', fontSize: 24, lineHeight: 32 },
    h3: { fontWeight: '600', fontSize: 20, lineHeight: 28 },
    h4: { fontWeight: '600', fontSize: 18, lineHeight: 24 },
    body: { fontWeight: '400', fontSize: 16, lineHeight: 24 },
    bodyMedium: { fontWeight: '500', fontSize: 16, lineHeight: 24 },
    bodySm: { fontWeight: '400', fontSize: 14, lineHeight: 20 },
    bodySmMedium: { fontWeight: '500', fontSize: 14, lineHeight: 20 },
    caption: { fontWeight: '400', fontSize: 12, lineHeight: 16 },
    button: { fontWeight: '600', fontSize: 16, lineHeight: 24 },
    buttonSm: { fontWeight: '600', fontSize: 14, lineHeight: 20 },
    label: { fontWeight: '500', fontSize: 13, lineHeight: 18 },
    price: { fontWeight: '700', fontSize: 18, lineHeight: 24 },
};
