/**
 * Auth service — phone + OTP
 */
import api from './api';

export interface LoginResponse {
    tokens: {
        access_token: string;
        token_type: string;
    };
    user: {
        id: string;
        phone: string;
        name: string | null;
        email: string | null;
        avatar_url: string | null;
        role: string;
        referral_code: string | null;
    };
}

export const authService = {
    /** Request OTP to phone */
    sendOTP: (phone: string) =>
        api.post<{ message: string; is_registered: boolean }>('/auth/send-code', { phone }),

    /** Verify OTP and get JWT */
    verifyOTP: (phone: string, code: string, email?: string, name?: string) =>
        api.post<LoginResponse>('/auth/verify', { phone, code, email, name }),

    /** Get current user profile */
    getProfile: () =>
        api.get<LoginResponse['user']>('/users/me'),

    /** Update profile */
    updateProfile: (data: { name?: string; email?: string }) =>
        api.patch<LoginResponse['user']>('/users/me', data),

    /** Upload avatar */
    uploadAvatar: (formData: FormData) =>
        api.post<LoginResponse['user']>('/users/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};
