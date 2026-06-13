/**
 * Tips service
 */
import api from './api';
import { CreatePaymentIntentResponse } from './types';

export interface CreateTipData {
    amount: number;
    staff_id: string;
    appointment_id?: string;
    payment_method?: 'wallet' | 'mercadopago' | 'stripe';
}

export const tipsService = {
    create: (data: CreateTipData) =>
        api.post('/tips/', {
            ...data,
            payment_method: data.payment_method ?? 'wallet',
        }),

    payIntent: (data: { amount: number; staff_id: string; appointment_id?: string }) =>
        api.post<CreatePaymentIntentResponse>('/tips/pay-intent', data),
};
