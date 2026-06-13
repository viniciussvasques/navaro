/**
 * Favorites service
 */
import api from './api';
import { Establishment } from './establishments';

export const favoritesService = {
    list: async () => {
        const { data } = await api.get<{ establishments: EstablishmentResponse[] }>('/favorites');
        // Backend returns { establishments: [...], staff: [...] }
        // We map to Establishment[]
        return data.establishments.map(e => ({
            id: e.establishment_id,
            name: e.establishment_name,
            slug: e.establishment_slug,
            logo_url: e.establishment_logo_url,
            cover_url: e.establishment_cover_url,
            category: e.establishment_category || 'other',
            city: e.establishment_city || '',
            state: e.establishment_state || '',
            avg_rating: e.establishment_avg_rating || undefined,
            // Defaults for required fields not in favorite structure
            address: '',
            phone: '',
            business_hours: {},
            queue_mode_enabled: false,
            status: 'active',
        } as Establishment));
    },

    add: (establishmentId: string) =>
        api.post('/favorites/establishments', { establishment_id: establishmentId }),

    remove: (establishmentId: string) =>
        api.post('/favorites/establishments', { establishment_id: establishmentId }),
    // Toggle endpoint handles both add/remove

    check: (establishmentId: string) =>
        api.get<{ is_favorite: boolean }>(`/favorites/establishments/${establishmentId}/check`),
};

interface EstablishmentResponse {
    establishment_id: string;
    establishment_name: string;
    establishment_slug: string;
    establishment_logo_url: string | null;
    establishment_cover_url: string | null;
    establishment_category: string | null;
    establishment_city: string | null;
    establishment_state: string | null;
    establishment_avg_rating: number | null;
}
