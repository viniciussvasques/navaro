/**
 * Subscriptions service
 */
import api from './api';

export interface SubscriptionUsage {
    service_id?: string;
    bundle_id?: string;
    used: number;
    limit: number;
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    description?: string | null;
    price: number;
}

export interface Subscription {
    id: string;
    establishment_id: string;
    plan_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    plan?: SubscriptionPlan;
    usage?: SubscriptionUsage[];
}

export const subscriptionService = {
    list: () => api.get<Subscription[]>('/subscriptions'),

    getById: (id: string) => api.get<Subscription>(`/subscriptions/${id}`),

    subscribe: (planId: string) =>
        api.post<Subscription>('/subscriptions', { plan_id: planId }),

    payIntent: (planId: string) =>
        api.post<import('./types').CreatePaymentIntentResponse>('/subscriptions/pay-intent', {
            plan_id: planId,
            provider: 'mercadopago',
        }),

    cancel: (id: string) => api.delete(`/subscriptions/${id}`),

    listPlans: (establishmentId: string) =>
        api.get<SubscriptionPlan[]>(`/establishments/${establishmentId}/subscription-plans`),
};
