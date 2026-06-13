/**
 * Appointments service
 */
import api from './api';

export interface AppointmentProduct {
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
}

export interface Appointment {
    id: string;
    establishment_id: string;
    staff_id: string;
    service_id: string | null;
    bundle_id: string | null;
    scheduled_at: string;
    duration_minutes: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    payment_type: string;
    payment_method: string;
    notes: string | null;
    total_price: number | null;
    created_at: string;
    establishment_name?: string;
    establishment_logo?: string;
    staff_name?: string;
    service_name?: string;
    products?: AppointmentProduct[];
}

export interface CreateAppointmentData {
    establishment_id: string;
    staff_id: string;
    service_id?: string;
    service_ids?: string[];
    bundle_id?: string;
    scheduled_at: string;
    duration_minutes?: number;
    payment_type: string;
    payment_method: string;
    notes?: string;
}

export const appointmentService = {
    create: (data: CreateAppointmentData) =>
        api.post<Appointment>('/appointments', data),

    list: (status?: string) =>
        api.get<Appointment[]>('/appointments', { params: { status } }),

    getById: (id: string) =>
        api.get<Appointment>(`/appointments/${id}`),

    cancel: (id: string, reason?: string) =>
        api.delete(`/appointments/${id}`, { params: reason ? { reason } : undefined }),

    reschedule: (id: string, scheduled_at: string) =>
        api.patch<Appointment>(`/appointments/${id}`, { scheduled_at }),
};
