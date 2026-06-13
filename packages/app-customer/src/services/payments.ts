/**
 * Payments service — Mercado Pago, wallet, config
 */
import api from './api';
import { CreatePaymentIntentResponse } from './types';

export interface PaymentConfig {
    mercadopago_enabled: boolean;
    mercadopago_public_key?: string | null;
    stripe_enabled: boolean;
}

export const paymentsService = {
    getConfig: () => api.get<PaymentConfig>('/payments/config'),

    createAppointmentIntent: (appointmentId: string, provider = 'mercadopago') =>
        api.post<CreatePaymentIntentResponse>('/payments/create-intent', {
            appointment_id: appointmentId,
            provider,
        }),

    createCheckout: (appointmentId: string) =>
        api.post<{ checkout_url: string; sandbox_url?: string; amount: number }>(
            '/payments/create-checkout',
            { appointment_id: appointmentId }
        ),

    createSubscriptionIntent: (planId: string, provider = 'mercadopago') =>
        api.post<CreatePaymentIntentResponse>('/subscriptions/pay-intent', {
            plan_id: planId,
            provider,
        }),

    createTipIntent: (data: { amount: number; staff_id: string; appointment_id?: string }) =>
        api.post<CreatePaymentIntentResponse>('/tips/pay-intent', data),

    checkStatus: (paymentId: string) =>
        api.get<{ status: string; type?: string }>(`/payments/status/${paymentId}`),

    payWallet: (appointmentId: string) =>
        api.post('/payments/pay-wallet', { appointment_id: appointmentId }),
};

export type { CreatePaymentIntentResponse };
