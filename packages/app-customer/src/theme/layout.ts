export const TAB_BAR_HEIGHT = 56;
/** Menu web: ícone (24) + rótulo (16) + margens — altura total inclui padding interno. */
export const TAB_BAR_WEB_HEIGHT = 88;

/** Padding inferior de ScrollViews acima da tab bar. */
export function getTabBarPadding(bottomInset: number): number {
    return TAB_BAR_HEIGHT + bottomInset + 16;
}
