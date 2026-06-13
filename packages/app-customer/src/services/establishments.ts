/**
 * Establishments service
 */
import api from './api';

export interface Establishment {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string | null;
    address: string;
    city: string;
    state: string;
    latitude: number | null;
    longitude: number | null;
    phone: string;
    whatsapp: string | null;
    logo_url: string | null;
    cover_url: string | null;
    business_hours: Record<string, any>;
    queue_mode_enabled: boolean;
    status: string;
    google_maps_url: string | null;
    distance?: number;
    avg_rating?: number;
    review_count?: number;
    min_price?: number;
    is_sponsored?: boolean;
}

export interface Service {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    price: number;
    duration_minutes: number;
    active: boolean;
    sort_order: number;
    deposit_required: boolean;
    is_at_home: boolean;
}

export interface StaffMember {
    id: string;
    name: string;
    role: string;
    avatar_url: string | null;
    bio: string | null;
    work_schedule: Record<string, any>;
    active: boolean;
    avg_rating?: number;
    services?: string[];
}

export interface Review {
    id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    owner_response: string | null;
    created_at: string;
    user_name?: string;
    user_avatar?: string;
}

export interface SearchParams {
    q?: string;
    category?: string;
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    min_rating?: number;
    max_price?: number;
    sort_by?: 'distance' | 'rating' | 'price';
    page?: number;
    page_size?: number;
}

export interface TimeSlot {
    time: string;
    available: boolean;
    staff_id?: string;
    staff_name?: string;
}

export const establishmentService = {
    search: (params: SearchParams) =>
        api.get<{ items: Establishment[]; total: number }>('/establishments', { params }),

    getById: (
        id: string,
        opts?: { trackClick?: boolean; lat?: number; lng?: number; city?: string },
    ) =>
        api.get<Establishment>(`/establishments/${id}`, {
            params: {
                track_click: opts?.trackClick ?? false,
                lat: opts?.lat,
                lng: opts?.lng,
                city: opts?.city,
            },
        }),

    getBySlug: (slug: string) =>
        api.get<Establishment>(`/establishments/slug/${slug}`),

    getServices: (establishmentId: string) =>
        api.get<Service[]>(`/establishments/${establishmentId}/services`),

    getStaff: (establishmentId: string) =>
        api.get<StaffMember[]>(`/establishments/${establishmentId}/staff`),

    getReviews: (establishmentId: string, page = 1, pageSize = 10) =>
        api.get<{ items: Review[]; total: number }>(
            `/reviews/establishments/${establishmentId}`,
            { params: { page, page_size: pageSize } }
        ),

    getAvailableSlots: (establishmentId: string, staffId: string, date: string) => {
        const params: any = { date };
        if (staffId && staffId !== 'any') {
            params.staff_id = staffId;
        }
        return api.get<TimeSlot[]>(
            `/establishments/${establishmentId}/slots`,
            { params }
        );
    },
};
