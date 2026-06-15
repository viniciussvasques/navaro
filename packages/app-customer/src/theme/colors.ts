/**
 * DUNNAA — paleta premium (navy escuro + dourado, sem verde)
 */
export const colors = {
    primary: '#121826',
    primaryLight: '#1E293B',
    primaryDark: '#0A0D12',
    secondary: '#2A3444',
    secondaryLight: '#3D4A5C',
    accent: '#D4AF37',
    accentLight: '#F0DFA8',
    accentDark: '#B8942E',

    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFC',
    surfaceElevated: '#FFFFFF',
    background: '#F1F3F7',

    textMain: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textLight: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#1A1508',

    success: '#10B981',
    successDark: '#059669',
    successSoft: '#D1FAE5',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',

    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#E5E7EB',

    overlay: 'rgba(10, 13, 18, 0.6)',
    overlayLight: 'rgba(10, 13, 18, 0.25)',

    star: '#F59E0B',
    gold: '#D4AF37',

    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
