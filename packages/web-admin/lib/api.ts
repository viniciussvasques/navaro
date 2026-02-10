import axios from 'axios';
import { getCookie } from 'cookies-next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Crucial for HttpOnly cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    // We still check for manual token in case of mobile/other apps, 
    // but browser will automatically send the 'access_token' cookie.
    const token = getCookie('admin_token');
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized (redirect to login)
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
// Support Types
export interface Ticket {
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: 'general' | 'technical' | 'financial' | 'account';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
    updated_at: string;
    user: any;
    assigned_to?: any;
    messages?: TicketMessage[];
    queue_position?: number;
    estimated_wait_time_minutes?: number;
}

export interface TicketMessage {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    sender: any;
    attachments: string[];
}

export const SupportService = {
    list: async (params?: any) => {
        const res = await api.get('/support/tickets', { params });
        return res.data;
    },
    create: async (data: any) => {
        const res = await api.post('/support/tickets', data);
        return res.data;
    },
    get: async (id: string) => {
        const res = await api.get(`/support/tickets/${id}`);
        return res.data;
    },
    update: async (id: string, data: any) => {
        const res = await api.patch(`/support/tickets/${id}`, data);
        return res.data;
    },
    sendMessage: async (id: string, data: any) => {
        const res = await api.post(`/support/tickets/${id}/messages`, data);
        return res.data;
    },
    getContext: async (id: string) => {
        const res = await api.get(`/support/tickets/${id}/context`);
        return res.data;
    },
    cancelAppointment: async (ticketId: string, appointmentId: string, reason: string) => {
        const res = await api.post(`/support/tickets/${ticketId}/appointments/${appointmentId}/cancel`, { reason });
        return res.data;
    }
};

export const UserService = {
    updateRole: async (id: string, role: string) => {
        const res = await api.patch(`/admin/users/${id}/role`, { role });
        return res.data;
    }
};

export default api;
