import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface CategoryOption {
    key: string;
    label: string;
    icon: IoniconName;
}

export const HOME_CATEGORIES: CategoryOption[] = [
    { key: 'all', label: 'Todos', icon: 'grid-outline' },
    { key: 'barbershop', label: 'Barbearia', icon: 'cut-outline' },
    { key: 'salon', label: 'Salão', icon: 'sparkles-outline' },
    { key: 'beauty_salon', label: 'Beleza', icon: 'color-palette-outline' },
    { key: 'esthetics', label: 'Estética', icon: 'leaf-outline' },
    { key: 'spa', label: 'Spa', icon: 'water-outline' },
];
