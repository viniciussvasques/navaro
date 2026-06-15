import api from './api';

export interface LoginResponse {
    tokens: { access_token: string; token_type: string };
    user: {
        id: string;
        phone: string;
        name: string | null;
        email: string | null;
        role: string;
    };
}

export const authService = {
    sendOTP: (phone: string) =>
        api.post<{ message: string; is_registered: boolean }>('/auth/send-code', { phone }),

    verifyOTP: (phone: string, code: string, email?: string, name?: string) =>
        api.post<LoginResponse>('/auth/verify', { phone, code, email, name }),
};

export interface Establishment {
    id: string;
    name: string;
    logo_url?: string | null;
    queue_mode_enabled?: boolean;
}

export const establishmentService = {
    listMine: () => api.get<Establishment[]>('/establishments/my'),
};

export interface QueueEntry {
    id: string;
    position: number;
    status: string;
    user_name?: string | null;
    service_name?: string | null;
    entered_at: string;
}

export const queueService = {
    list: (establishmentId: string) =>
        api.get<{ items: QueueEntry[]; total_waiting: number; current_serving: number }>(
            `/queue/establishments/${establishmentId}`
        ),
    updateStatus: (id: string, status: string) =>
        api.patch(`/queue/${id}/status`, { status }),
};

export interface Appointment {
    id: string;
    scheduled_at: string;
    status: string;
    user_name?: string | null;
    service_name?: string | null;
    staff_name?: string | null;
    total_price?: number | null;
}

export const appointmentService = {
    listByEstablishment: (establishmentId: string, date?: string) =>
        api.get<Appointment[]>(`/appointments/establishments/${establishmentId}`, {
            params: date ? { date } : undefined,
        }),
    updateStatus: (appointmentId: string, status: string) =>
        api.patch<Appointment>(`/appointments/${appointmentId}`, { status }),
};
