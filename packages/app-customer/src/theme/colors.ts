/**
 * DUNNAA Brand Colors — "Deep Ocean" palette
 */
export const colors = {
    primary: '#005F73',
    primaryLight: '#0A7E8C',
    primaryDark: '#004A5A',
    secondary: '#0A9396',
    secondaryLight: '#31B5B8',
    accent: '#E9D8A6',
    accentDark: '#D4C08A',

    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFB',
    background: '#F1F5F9',

    textMain: '#1A1A1A',
    textSecondary: '#374151',
    textMuted: '#64748B',
    textLight: '#94A3B8',
    textOnPrimary: '#FFFFFF',

    success: '#94D2BD',
    successDark: '#2D9E7A',
    error: '#AE2012',
    errorLight: '#E74C3C',
    warning: '#F59E0B',
    warningLight: '#FCD34D',

    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#E5E7EB',

    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.25)',

    star: '#F59E0B',

    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
