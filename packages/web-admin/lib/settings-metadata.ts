/** Metadados de UI para system_settings — rótulos, tipos e opções predefinidas. */

export type SettingFieldType =
    | "boolean"
    | "select"
    | "number"
    | "url"
    | "email"
    | "phone"
    | "text"
    | "secret"
    | "preset";

export type SelectOption = { value: string; label: string; description?: string };

export type SettingFieldMeta = {
    label: string;
    type: SettingFieldType;
    placeholder?: string;
    help?: string;
    options?: SelectOption[];
    /** Sugestões para autocomplete (preset) */
    presets?: SelectOption[];
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    /** Exibir só quando outra chave tiver um destes valores */
    showWhen?: { key: string; values: string[] };
    group?: string;
};

export const MASKED_SECRET = "••••••••";

export const CATEGORY_META: Record<
    string,
    { label: string; description: string; icon?: string }
> = {
    general: {
        label: "Geral",
        description: "Identidade da plataforma, contatos de suporte e links legais.",
    },
    finance: {
        label: "Financeiro",
        description: "Taxas de comissão cobradas por plano de estabelecimento.",
    },
    payments: {
        label: "Pagamentos",
        description: "Gateways Stripe e Mercado Pago para cobranças e split.",
    },
    twilio: {
        label: "Twilio",
        description: "Credenciais compartilhadas para SMS e WhatsApp via Twilio.",
    },
    sms: {
        label: "SMS",
        description: "Envio de códigos OTP e notificações por SMS.",
    },
    email: {
        label: "E-mail",
        description: "Servidor SMTP para e-mails transacionais.",
    },
    push: {
        label: "Push",
        description: "Notificações push via Firebase (FCM) ou OneSignal.",
    },
    whatsapp: {
        label: "WhatsApp",
        description: "Códigos OTP, confirmações de agendamento e fila.",
    },
    storage: {
        label: "Storage",
        description: "Upload de imagens e arquivos (S3, Cloudflare R2, etc.).",
    },
    loyalty: {
        label: "Fidelidade",
        description: "Cashback global e bônus por indicação.",
    },
};

export const CATEGORY_ORDER = [
    "general",
    "finance",
    "payments",
    "twilio",
    "sms",
    "whatsapp",
    "email",
    "push",
    "storage",
    "loyalty",
];

const PROVIDER_WHATSAPP: SelectOption[] = [
    {
        value: "bridge",
        label: "Bridge DUNNAA (recomendado)",
        description: "WhatsApp Web via QR — sem custo de API oficial",
    },
    {
        value: "meta",
        label: "Meta Cloud API",
        description: "API oficial do WhatsApp Business",
    },
    {
        value: "twilio",
        label: "Twilio WhatsApp",
        description: "Usa credenciais Twilio da aba Twilio",
    },
];

const PROVIDER_SMS: SelectOption[] = [
    { value: "twilio", label: "Twilio", description: "SMS internacional via Twilio" },
    { value: "nvoip", label: "nVoIP", description: "SMS Brasil via nVoIP" },
];

const SMTP_PRESETS: SelectOption[] = [
    { value: "smtp.gmail.com", label: "Gmail", description: "Porta 587 + TLS" },
    { value: "smtp.sendgrid.net", label: "SendGrid", description: "Porta 587" },
    { value: "smtp.mailgun.org", label: "Mailgun", description: "Porta 587" },
    { value: "email-smtp.us-east-1.amazonaws.com", label: "Amazon SES", description: "Região US-East-1" },
    { value: "smtp.hostinger.com", label: "Hostinger", description: "Hospedagem compartilhada" },
];

const S3_PRESETS: SelectOption[] = [
    { value: "https://s3.amazonaws.com", label: "Amazon S3", description: "AWS padrão" },
    { value: "https://<account>.r2.cloudflarestorage.com", label: "Cloudflare R2", description: "Substitua <account>" },
    { value: "https://nyc3.digitaloceanspaces.com", label: "DigitalOcean Spaces", description: "Região NYC3" },
    { value: "https://storage.googleapis.com", label: "Google Cloud Storage", description: "GCS compatível S3" },
];

const META_API_PRESETS: SelectOption[] = [
    { value: "https://graph.facebook.com/v18.0", label: "v18.0 (padrão)" },
    { value: "https://graph.facebook.com/v19.0", label: "v19.0" },
    { value: "https://graph.facebook.com/v20.0", label: "v20.0" },
];

export const FIELD_META: Record<string, SettingFieldMeta> = {
    // ─── Geral ───────────────────────────────────────────────────────────────
    app_name: { label: "Nome do app", type: "text", placeholder: "DUNNAA", group: "Identidade" },
    support_email: {
        label: "E-mail de suporte",
        type: "email",
        placeholder: "suporte@dunnaa.com.br",
        group: "Suporte",
    },
    support_phone: {
        label: "Telefone de suporte",
        type: "phone",
        placeholder: "+5511999999999",
        group: "Suporte",
    },
    terms_url: {
        label: "URL dos Termos de Uso",
        type: "url",
        placeholder: "https://dunnaa.com.br/termos",
        group: "Legal",
    },
    privacy_url: {
        label: "URL da Política de Privacidade",
        type: "url",
        placeholder: "https://dunnaa.com.br/privacidade",
        group: "Legal",
    },

    // ─── Financeiro ──────────────────────────────────────────────────────────
    commission_free: {
        label: "Comissão plano Free",
        type: "number",
        min: 0,
        max: 100,
        step: 0.1,
        suffix: "%",
        group: "Comissões",
    },
    commission_silver: {
        label: "Comissão plano Prata",
        type: "number",
        min: 0,
        max: 100,
        step: 0.1,
        suffix: "%",
        group: "Comissões",
    },
    commission_gold: {
        label: "Comissão plano Ouro",
        type: "number",
        min: 0,
        max: 100,
        step: 0.1,
        suffix: "%",
        group: "Comissões",
    },

    // ─── Pagamentos ──────────────────────────────────────────────────────────
    stripe_enabled: { label: "Ativar Stripe", type: "boolean", group: "Stripe" },
    stripe_secret_key: {
        label: "Secret Key",
        type: "secret",
        placeholder: "sk_live_...",
        group: "Stripe",
        showWhen: { key: "stripe_enabled", values: ["true"] },
    },
    stripe_publishable_key: {
        label: "Publishable Key",
        type: "text",
        placeholder: "pk_live_...",
        group: "Stripe",
        showWhen: { key: "stripe_enabled", values: ["true"] },
    },
    stripe_webhook_secret: {
        label: "Webhook Secret",
        type: "secret",
        placeholder: "whsec_...",
        group: "Stripe",
        showWhen: { key: "stripe_enabled", values: ["true"] },
    },
    stripe_platform_fee_percent: {
        label: "Taxa da plataforma",
        type: "number",
        min: 0,
        max: 100,
        step: 0.1,
        suffix: "%",
        group: "Stripe",
        showWhen: { key: "stripe_enabled", values: ["true"] },
    },
    mercadopago_enabled: { label: "Ativar Mercado Pago", type: "boolean", group: "Mercado Pago" },
    mercadopago_access_token: {
        label: "Access Token",
        type: "secret",
        group: "Mercado Pago",
        showWhen: { key: "mercadopago_enabled", values: ["true"] },
    },
    mercadopago_public_key: {
        label: "Public Key",
        type: "text",
        group: "Mercado Pago",
        showWhen: { key: "mercadopago_enabled", values: ["true"] },
    },
    mercadopago_webhook_secret: {
        label: "Webhook Secret",
        type: "secret",
        group: "Mercado Pago",
        showWhen: { key: "mercadopago_enabled", values: ["true"] },
    },
    mercadopago_client_id: {
        label: "Client ID (OAuth marketplace)",
        type: "text",
        group: "Mercado Pago",
        showWhen: { key: "mercadopago_enabled", values: ["true"] },
    },
    mercadopago_client_secret: {
        label: "Client Secret (OAuth)",
        type: "secret",
        group: "Mercado Pago",
        showWhen: { key: "mercadopago_enabled", values: ["true"] },
    },
    mercadopago_oauth_redirect_uri: {
        label: "OAuth Redirect URI",
        type: "url",
        placeholder: "https://api.dunnaa.com.br/api/v1/mercadopago/oauth/callback",
        group: "Mercado Pago",
        showWhen: { key: "mercadopago_enabled", values: ["true"] },
    },

    // ─── Twilio ──────────────────────────────────────────────────────────────
    twilio_account_sid: {
        label: "Account SID",
        type: "text",
        placeholder: "ACxxxxxxxx",
        group: "Credenciais",
    },
    twilio_auth_token: {
        label: "Auth Token",
        type: "secret",
        group: "Credenciais",
    },
    twilio_sms_from: {
        label: "Número SMS (From)",
        type: "phone",
        placeholder: "+15551234567",
        help: "Número Twilio habilitado para SMS",
        group: "Números",
    },
    twilio_whatsapp_from: {
        label: "Número WhatsApp (From)",
        type: "phone",
        placeholder: "+14155238886",
        help: "Sandbox Twilio ou número aprovado para WhatsApp",
        group: "Números",
    },

    // ─── SMS ─────────────────────────────────────────────────────────────────
    sms_enabled: { label: "Ativar envio de SMS", type: "boolean", group: "Canal" },
    sms_provider: {
        label: "Provedor SMS",
        type: "select",
        options: PROVIDER_SMS,
        group: "Canal",
        showWhen: { key: "sms_enabled", values: ["true"] },
    },
    nvoip_token: {
        label: "nVoIP API Key",
        type: "secret",
        group: "nVoIP",
        showWhen: { key: "sms_provider", values: ["nvoip"] },
    },
    nvoip_from_number: {
        label: "nVoIP — número de origem",
        type: "phone",
        group: "nVoIP",
        showWhen: { key: "sms_provider", values: ["nvoip"] },
    },

    // ─── E-mail ──────────────────────────────────────────────────────────────
    email_enabled: { label: "Ativar envio de e-mail", type: "boolean", group: "Canal" },
    smtp_host: {
        label: "Servidor SMTP",
        type: "preset",
        presets: SMTP_PRESETS,
        placeholder: "smtp.gmail.com",
        group: "Servidor",
        showWhen: { key: "email_enabled", values: ["true"] },
    },
    smtp_port: {
        label: "Porta SMTP",
        type: "number",
        min: 1,
        max: 65535,
        step: 1,
        placeholder: "587",
        group: "Servidor",
        showWhen: { key: "email_enabled", values: ["true"] },
    },
    smtp_use_tls: {
        label: "Usar TLS",
        type: "boolean",
        group: "Servidor",
        showWhen: { key: "email_enabled", values: ["true"] },
    },
    smtp_user: {
        label: "Usuário SMTP",
        type: "text",
        group: "Autenticação",
        showWhen: { key: "email_enabled", values: ["true"] },
    },
    smtp_password: {
        label: "Senha SMTP",
        type: "secret",
        group: "Autenticação",
        showWhen: { key: "email_enabled", values: ["true"] },
    },
    smtp_from_email: {
        label: "E-mail remetente",
        type: "email",
        placeholder: "noreply@dunnaa.com.br",
        group: "Remetente",
        showWhen: { key: "email_enabled", values: ["true"] },
    },
    smtp_from_name: {
        label: "Nome remetente",
        type: "text",
        placeholder: "DUNNAA",
        group: "Remetente",
        showWhen: { key: "email_enabled", values: ["true"] },
    },

    // ─── Push ────────────────────────────────────────────────────────────────
    fcm_enabled: { label: "Ativar Firebase (FCM)", type: "boolean", group: "Firebase" },
    fcm_project_id: {
        label: "FCM Project ID",
        type: "text",
        group: "Firebase",
        showWhen: { key: "fcm_enabled", values: ["true"] },
    },
    fcm_server_key: {
        label: "FCM Server Key",
        type: "secret",
        group: "Firebase",
        showWhen: { key: "fcm_enabled", values: ["true"] },
    },
    onesignal_enabled: { label: "Ativar OneSignal", type: "boolean", group: "OneSignal" },
    onesignal_app_id: {
        label: "OneSignal App ID",
        type: "text",
        group: "OneSignal",
        showWhen: { key: "onesignal_enabled", values: ["true"] },
    },
    onesignal_api_key: {
        label: "OneSignal API Key",
        type: "secret",
        group: "OneSignal",
        showWhen: { key: "onesignal_enabled", values: ["true"] },
    },

    // ─── WhatsApp ────────────────────────────────────────────────────────────
    whatsapp_enabled: { label: "Ativar WhatsApp", type: "boolean", group: "Canal" },
    whatsapp_provider: {
        label: "Provedor WhatsApp",
        type: "select",
        options: PROVIDER_WHATSAPP,
        group: "Canal",
        showWhen: { key: "whatsapp_enabled", values: ["true"] },
    },
    whatsapp_api_url: {
        label: "Meta — URL da API",
        type: "preset",
        presets: META_API_PRESETS,
        group: "Meta Cloud API",
        showWhen: { key: "whatsapp_provider", values: ["meta"] },
    },
    whatsapp_access_token: {
        label: "Meta — Access Token",
        type: "secret",
        group: "Meta Cloud API",
        showWhen: { key: "whatsapp_provider", values: ["meta"] },
    },
    whatsapp_phone_number_id: {
        label: "Meta — Phone Number ID",
        type: "text",
        group: "Meta Cloud API",
        showWhen: { key: "whatsapp_provider", values: ["meta"] },
    },

    // ─── Storage ─────────────────────────────────────────────────────────────
    storage_enabled: { label: "Ativar storage S3/R2", type: "boolean", group: "Canal" },
    s3_endpoint: {
        label: "Endpoint S3",
        type: "preset",
        presets: S3_PRESETS,
        placeholder: "https://...",
        group: "Bucket",
        showWhen: { key: "storage_enabled", values: ["true"] },
    },
    s3_bucket: {
        label: "Nome do bucket",
        type: "text",
        placeholder: "dunnaa",
        group: "Bucket",
        showWhen: { key: "storage_enabled", values: ["true"] },
    },
    s3_public_url: {
        label: "URL pública (CDN)",
        type: "url",
        placeholder: "https://cdn.dunnaa.com.br",
        group: "Bucket",
        showWhen: { key: "storage_enabled", values: ["true"] },
    },
    s3_access_key: {
        label: "Access Key",
        type: "secret",
        group: "Credenciais",
        showWhen: { key: "storage_enabled", values: ["true"] },
    },
    s3_secret_key: {
        label: "Secret Key",
        type: "secret",
        group: "Credenciais",
        showWhen: { key: "storage_enabled", values: ["true"] },
    },

    // ─── Fidelidade ──────────────────────────────────────────────────────────
    cashback_enabled: { label: "Ativar cashback global", type: "boolean", group: "Cashback" },
    cashback_percent: {
        label: "Percentual de cashback",
        type: "number",
        min: 0,
        max: 100,
        step: 0.1,
        suffix: "%",
        group: "Cashback",
        showWhen: { key: "cashback_enabled", values: ["true"] },
    },
    referral_bonus_amount: {
        label: "Bônus por indicação",
        type: "number",
        min: 0,
        step: 0.01,
        suffix: "R$",
        group: "Indicação",
    },
};

/** Chaves booleanas sem entrada explícita em FIELD_META */
const BOOLEAN_SUFFIX = /^(.*_enabled|smtp_use_tls)$/;

export function inferFieldMeta(key: string, description?: string): SettingFieldMeta {
    if (FIELD_META[key]) return FIELD_META[key];
    if (BOOLEAN_SUFFIX.test(key)) {
        return {
            label: humanizeKey(key),
            type: "boolean",
            help: description,
        };
    }
    if (key.includes("secret") || key.includes("token") || key.includes("password") || key.includes("_key")) {
        return { label: humanizeKey(key), type: "secret", help: description };
    }
    if (key.includes("_url") || key.includes("_uri")) {
        return { label: humanizeKey(key), type: "url", help: description };
    }
    if (key.includes("_email")) {
        return { label: humanizeKey(key), type: "email", help: description };
    }
    if (key.includes("_phone") || key.includes("_from")) {
        return { label: humanizeKey(key), type: "phone", help: description };
    }
    if (key.includes("_percent") || key.includes("_amount") || key.includes("_port") || key.includes("_days") || key.includes("_price")) {
        return { label: humanizeKey(key), type: "number", help: description };
    }
    return { label: humanizeKey(key), type: "text", help: description };
}

function humanizeKey(key: string): string {
    return key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isTruthySetting(value: string | null | undefined): boolean {
    if (!value) return false;
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

export function shouldShowField(
    key: string,
    valuesByKey: Record<string, string | null | undefined>
): boolean {
    const meta = FIELD_META[key];
    if (!meta?.showWhen) return true;
    const dep = valuesByKey[meta.showWhen.key];
    return meta.showWhen.values.includes(String(dep ?? "").toLowerCase());
}

export function groupSettings<T extends { key: string; category: string }>(
    items: T[],
    category: string
): Map<string, T[]> {
    const filtered = items.filter((s) => s.category === category);
    const groups = new Map<string, T[]>();
    for (const item of filtered) {
        const meta = inferFieldMeta(item.key);
        const group = meta.group ?? "Outros";
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push(item);
    }
    return groups;
}
