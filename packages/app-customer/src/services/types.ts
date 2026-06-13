export interface CreatePaymentIntentResponse {
    amount: number;
    provider: string;
    provider_payment_id: string;
    qr_code?: string | null;
    qr_code_base64?: string | null;
    ticket_url?: string | null;
    plan_id?: string | null;
    plan_name?: string | null;
}
