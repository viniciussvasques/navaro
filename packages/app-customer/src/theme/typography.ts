/**
 * Typography scales for DUNNAA — Plus Jakarta Sans
 */
import { TextStyle } from 'react-native';

export const fontFamily = {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
} as const;

export const typography: Record<string, TextStyle> = {
    h1: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40 },
    h2: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 32 },
    h3: { fontFamily: fontFamily.semiBold, fontSize: 20, lineHeight: 28 },
    h4: { fontFamily: fontFamily.semiBold, fontSize: 18, lineHeight: 24 },
    body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
    bodyMedium: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 24 },
    bodySm: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
    bodySmMedium: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20 },
    caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
    captionMedium: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
    button: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 24 },
    buttonSm: { fontFamily: fontFamily.semiBold, fontSize: 14, lineHeight: 20 },
    label: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
    price: { fontFamily: fontFamily.bold, fontSize: 18, lineHeight: 24 },
};
