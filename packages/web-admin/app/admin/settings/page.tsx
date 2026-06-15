"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    CATEGORY_META,
    CATEGORY_ORDER,
    FIELD_META,
    MASKED_SECRET,
    inferFieldMeta,
    isTruthySetting,
    shouldShowField,
    groupSettings,
    type SelectOption,
} from "@/lib/settings-metadata";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Settings,
    Save,
    RefreshCcw,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Smartphone,
    ChevronDown,
    Info,
} from "lucide-react";

type SettingItem = {
    category: string;
    key: string;
    value: string;
    description?: string;
    is_secret?: boolean;
};

type BridgeStatus = {
    connected: boolean;
    qr?: string;
    error?: { code?: number; message?: string };
};

const CATEGORY_STATUS_KEYS: Record<string, string | string[]> = {
    sms: "sms_enabled",
    email: "email_enabled",
    whatsapp: "whatsapp_enabled",
    payments: ["stripe_enabled", "mercadopago_enabled"],
    push: ["fcm_enabled", "onesignal_enabled"],
    storage: "storage_enabled",
    loyalty: "cashback_enabled",
};

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("general");
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["admin-settings"],
        queryFn: async () => {
            const res = await api.get("/admin/settings");
            return res.data as { items: SettingItem[]; total: number };
        },
    });

    const { data: bridgeStatus } = useQuery({
        queryKey: ["whatsapp-bridge-status-settings"],
        queryFn: async () => {
            const res = await api.get("/admin/whatsapp-bridge/status");
            return res.data as BridgeStatus;
        },
        enabled: activeTab === "whatsapp",
        refetchInterval: activeTab === "whatsapp" ? 15000 : false,
    });

    const settings = data?.items ?? [];

    const settingsSignature = useMemo(
        () => settings.map((s) => `${s.key}=${s.value}`).join("|"),
        [settings]
    );

    useEffect(() => {
        if (settings.length === 0) return;
        const initial: Record<string, string> = {};
        for (const s of settings) {
            initial[s.key] = s.value ?? "";
        }
        setDraft(initial);
        setDirtyKeys(new Set());
    }, [settingsSignature, settings.length]);

    const valuesByKey = useMemo(() => draft, [draft]);

    const categories = useMemo(() => {
        const set = new Set(settings.map((s) => s.category));
        return CATEGORY_ORDER.filter((c) => set.has(c)).concat(
            [...set].filter((c) => !CATEGORY_ORDER.includes(c))
        );
    }, [settings]);

    useEffect(() => {
        if (categories.length > 0 && !categories.includes(activeTab)) {
            setActiveTab(categories[0]);
        }
    }, [categories, activeTab]);

    const saveMutation = useMutation({
        mutationFn: async (entries: { key: string; value: string }[]) => {
            for (const { key, value } of entries) {
                await api.put(`/admin/settings/${key}`, { value });
            }
        },
        onSuccess: (_, variables) => {
            setError(null);
            setSuccess(`${variables.length} configuração(ões) salva(s).`);
            setDirtyKeys(new Set());
            queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
            setTimeout(() => setSuccess(null), 4000);
        },
        onError: (err: unknown) => {
            const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
                ?.detail;
            setError(typeof detail === "string" ? detail : "Erro ao salvar configurações.");
        },
    });

    const seedMutation = useMutation({
        mutationFn: () => api.post("/admin/settings/seed-defaults"),
        onSuccess: () => {
            setError(null);
            setSuccess("Configurações padrão inicializadas.");
            queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
        },
        onError: (err: unknown) => {
            const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
                ?.detail;
            setError(typeof detail === "string" ? detail : "Erro ao inicializar.");
        },
    });

    const setFieldValue = useCallback((key: string, value: string, original: string) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
        setDirtyKeys((prev) => {
            const next = new Set(prev);
            if (value === original) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const dirtyInCategory = useCallback(
        (category: string) => {
            const keys = settings.filter((s) => s.category === category).map((s) => s.key);
            return keys.some((k) => dirtyKeys.has(k));
        },
        [dirtyKeys, settings]
    );

    const saveCategory = (category: string) => {
        const toSave = settings
            .filter((s) => s.category === category && dirtyKeys.has(s.key))
            .map((s) => {
                const val = draft[s.key] ?? "";
                if (s.is_secret && (val === MASKED_SECRET || val === "")) {
                    return null;
                }
                return { key: s.key, value: val };
            })
            .filter(Boolean) as { key: string; value: string }[];

        if (toSave.length === 0) {
            setError("Nenhuma alteração válida para salvar.");
            return;
        }
        saveMutation.mutate(toSave);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <Settings className="text-blue-400" size={28} />
                        Configurações
                    </h2>
                    <p className="text-gray-400 mt-1 max-w-2xl">
                        Integrações, taxas e canais de comunicação. Alterações são persistidas no
                        banco e cache Redis (TTL 1h).
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="border-white/10 bg-white/5 hover:bg-white/10"
                    >
                        {isFetching ? (
                            <Loader2 className="animate-spin mr-2" size={14} />
                        ) : (
                            <RefreshCcw className="mr-2" size={14} />
                        )}
                        Recarregar
                    </Button>
                </div>
            </div>

            {error && (
                <AlertBanner variant="error" onDismiss={() => setError(null)}>
                    {error}
                </AlertBanner>
            )}
            {success && (
                <AlertBanner variant="success" onDismiss={() => setSuccess(null)}>
                    {success}
                </AlertBanner>
            )}

            {settings.length === 0 ? (
                <Card className="border-dashed border-white/10 bg-white/[0.02]">
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                        <p className="text-gray-400 text-sm">
                            Nenhuma configuração encontrada no banco.
                        </p>
                        <Button
                            onClick={() => seedMutation.mutate()}
                            disabled={seedMutation.isPending}
                        >
                            {seedMutation.isPending ? (
                                <Loader2 className="animate-spin mr-2" size={16} />
                            ) : (
                                <RefreshCcw className="mr-2" size={16} />
                            )}
                            Inicializar configurações padrão
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-full justify-start">
                        {categories.map((cat) => {
                            const meta = CATEGORY_META[cat];
                            const statusKey = CATEGORY_STATUS_KEYS[cat];
                            const active = statusKey
                                ? Array.isArray(statusKey)
                                    ? statusKey.some((k) => isTruthySetting(valuesByKey[k]))
                                    : isTruthySetting(valuesByKey[statusKey])
                                : false;
                            return (
                                <TabsTrigger
                                    key={cat}
                                    value={cat}
                                    className="rounded-xl px-4 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                                >
                                    <span className="flex items-center gap-2">
                                        {meta?.label ?? cat}
                                        {statusKey && (
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-400" : "bg-gray-600"}`}
                                            />
                                        )}
                                        {dirtyInCategory(cat) && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        )}
                                    </span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {categories.map((cat) => (
                        <TabsContent key={cat} value={cat} className="space-y-6 mt-0">
                            <CategoryHeader category={cat} valuesByKey={valuesByKey} />

                            {cat === "whatsapp" && (
                                <WhatsAppBridgePanel status={bridgeStatus} />
                            )}

                            {cat === "payments" && <PaymentsGuidePanel />}

                            {[...groupSettings(settings, cat).entries()].map(([groupName, items]) => {
                                const visible = items.filter((s) =>
                                    shouldShowField(s.key, valuesByKey)
                                );
                                if (visible.length === 0) return null;
                                return (
                                    <Card
                                        key={groupName}
                                        className="border-white/10 bg-white/[0.03] backdrop-blur"
                                    >
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-base font-semibold text-white">
                                                {groupName}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-5">
                                            {visible.map((setting) => (
                                                <SettingFieldRow
                                                    key={setting.key}
                                                    setting={setting}
                                                    value={draft[setting.key] ?? ""}
                                                    original={setting.value ?? ""}
                                                    isDirty={dirtyKeys.has(setting.key)}
                                                    valuesByKey={valuesByKey}
                                                    onChange={(v) =>
                                                        setFieldValue(
                                                            setting.key,
                                                            v,
                                                            setting.value ?? ""
                                                        )
                                                    }
                                                />
                                            ))}
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {dirtyInCategory(cat) && (
                                <div className="sticky bottom-4 flex justify-end">
                                    <Button
                                        size="lg"
                                        onClick={() => saveCategory(cat)}
                                        disabled={saveMutation.isPending}
                                        className="shadow-lg shadow-blue-500/20"
                                    >
                                        {saveMutation.isPending ? (
                                            <Loader2 className="animate-spin mr-2" size={18} />
                                        ) : (
                                            <Save className="mr-2" size={18} />
                                        )}
                                        Salvar alterações
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}

function CategoryHeader({
    category,
    valuesByKey,
}: {
    category: string;
    valuesByKey: Record<string, string | null | undefined>;
}) {
    const meta = CATEGORY_META[category];
    const statusKey = CATEGORY_STATUS_KEYS[category];
    const enabled = statusKey
        ? Array.isArray(statusKey)
            ? statusKey.some((k) => isTruthySetting(valuesByKey[k]))
            : isTruthySetting(valuesByKey[statusKey])
        : null;

    return (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5">
            <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold">{meta?.label ?? category}</h3>
                {enabled !== null && (
                    <Badge
                        variant="outline"
                        className={
                            enabled
                                ? "border-green-500/40 text-green-400 bg-green-500/10"
                                : "border-gray-500/40 text-gray-400 bg-white/5"
                        }
                    >
                        {enabled ? "Ativo" : "Inativo"}
                    </Badge>
                )}
            </div>
            {meta?.description && (
                <p className="text-sm text-gray-400 mt-1">{meta.description}</p>
            )}
        </div>
    );
}

function WhatsAppBridgePanel({ status }: { status?: BridgeStatus }) {
    const connected = status?.connected === true;
    return (
        <Card className="border-green-500/20 bg-green-500/[0.04]">
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Smartphone size={18} className="text-green-400" />
                            WhatsApp Bridge
                        </CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                            Provider <strong className="text-green-300">bridge</strong> usa este
                            serviço. Escaneie o QR para vincular o número.
                        </CardDescription>
                    </div>
                    <Badge
                        variant="outline"
                        className={
                            connected
                                ? "border-green-500/40 text-green-400"
                                : "border-amber-500/40 text-amber-400"
                        }
                    >
                        {connected ? "Conectado" : "Desconectado"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <Link href="/admin/whatsapp-bridge">
                    <Button variant="outline" className="border-green-500/30 hover:bg-green-500/10">
                        Gerenciar conexão e QR Code
                        <ExternalLink className="ml-2" size={14} />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}

function PaymentsGuidePanel() {
    return (
        <Card className="border-emerald-500/20 bg-emerald-500/[0.04]">
            <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-200">Referência rápida</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-400 space-y-2">
                <p>
                    <strong className="text-emerald-300">Mercado Pago:</strong> webhook em{" "}
                    <code className="text-emerald-300/90 break-all">
                        https://api.dunnaa.com.br/api/v1/payments/webhooks/mercadopago
                    </code>
                </p>
                <p>
                    Credenciais em{" "}
                    <a
                        href="https://www.mercadopago.com.br/developers"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 underline"
                    >
                        mercadopago.com.br/developers
                    </a>
                </p>
            </CardContent>
        </Card>
    );
}

function SettingFieldRow({
    setting,
    value,
    original,
    isDirty,
    valuesByKey,
    onChange,
}: {
    setting: SettingItem;
    value: string;
    original: string;
    isDirty: boolean;
    valuesByKey: Record<string, string | null | undefined>;
    onChange: (v: string) => void;
}) {
    const meta = inferFieldMeta(setting.key, setting.description);
    const fieldMeta = FIELD_META[setting.key] ?? meta;
    const isSecret = setting.is_secret || fieldMeta.type === "secret";
    const displayValue = isSecret && value === MASKED_SECRET ? "" : value;

    return (
        <div
            className={`grid gap-3 sm:grid-cols-[1fr_minmax(220px,320px)] sm:items-start pb-5 border-b border-white/5 last:border-0 last:pb-0 ${isDirty ? "opacity-100" : ""}`}
        >
            <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-sm font-medium text-white">{fieldMeta.label}</label>
                    {isDirty && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                            alterado
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-gray-500 font-mono">{setting.key}</p>
                {(fieldMeta.help || setting.description) && (
                    <p className="text-xs text-gray-400 leading-relaxed">
                        {fieldMeta.help ?? setting.description}
                    </p>
                )}
            </div>

            <FieldControl
                meta={fieldMeta}
                isSecret={isSecret}
                masked={isSecret && original === MASKED_SECRET}
                value={displayValue}
                rawValue={value}
                onChange={onChange}
            />
        </div>
    );
}

function FieldControl({
    meta,
    isSecret,
    masked,
    value,
    rawValue,
    onChange,
}: {
    meta: ReturnType<typeof inferFieldMeta>;
    isSecret: boolean;
    masked: boolean;
    value: string;
    rawValue: string;
    onChange: (v: string) => void;
}) {
    const inputClass =
        "bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-blue-500/40";

    if (meta.type === "boolean") {
        const on = isTruthySetting(rawValue);
        return (
            <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => onChange(on ? "false" : "true")}
                className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border transition-colors ${
                    on
                        ? "bg-blue-600 border-blue-500"
                        : "bg-white/10 border-white/10"
                }`}
            >
                <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                        on ? "translate-x-8" : "translate-x-1"
                    }`}
                />
                <span className="sr-only">{meta.label}</span>
            </button>
        );
    }

    if (meta.type === "select" && meta.options) {
        return (
            <SelectControl
                options={meta.options}
                value={rawValue}
                onChange={onChange}
            />
        );
    }

    if (meta.type === "preset" && meta.presets) {
        return (
            <PresetControl
                presets={meta.presets}
                value={value}
                placeholder={meta.placeholder}
                onChange={onChange}
                inputClass={inputClass}
            />
        );
    }

    if (meta.type === "number") {
        return (
            <div className="flex items-center gap-2">
                <Input
                    type="number"
                    min={meta.min}
                    max={meta.max}
                    step={meta.step ?? 1}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClass}
                />
                {meta.suffix && (
                    <span className="text-xs text-gray-500 shrink-0">{meta.suffix}</span>
                )}
            </div>
        );
    }

    return (
        <Input
            type={isSecret ? "password" : meta.type === "email" ? "email" : meta.type === "url" ? "url" : "text"}
            value={value}
            placeholder={
                masked
                    ? "••••••••  (deixe vazio para manter)"
                    : meta.placeholder ?? (meta.type === "phone" ? "+5511999999999" : undefined)
            }
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            autoComplete={isSecret ? "off" : meta.type === "email" ? "email" : "off"}
        />
    );
}

function SelectControl({
    options,
    value,
    onChange,
}: {
    options: SelectOption[];
    value: string;
    onChange: (v: string) => void;
}) {
    const selected = options.find((o) => o.value === value);
    return (
        <div className="space-y-2">
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full appearance-none bg-black/40 border border-white/10 rounded-md h-10 px-3 pr-9 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-gray-900">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
            </div>
            {selected?.description && (
                <p className="text-[11px] text-gray-500 flex items-start gap-1">
                    <Info size={12} className="shrink-0 mt-0.5" />
                    {selected.description}
                </p>
            )}
        </div>
    );
}

function PresetControl({
    presets,
    value,
    placeholder,
    onChange,
    inputClass,
}: {
    presets: SelectOption[];
    value: string;
    placeholder?: string;
    onChange: (v: string) => void;
    inputClass: string;
}) {
    const [open, setOpen] = useState(false);
    const filtered = presets.filter(
        (p) =>
            !value ||
            p.value.toLowerCase().includes(value.toLowerCase()) ||
            p.label.toLowerCase().includes(value.toLowerCase())
    );

    return (
        <div className="relative">
            <Input
                value={value}
                placeholder={placeholder}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                className={inputClass}
                list={`preset-${value}`}
            />
            {open && filtered.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-white/10 bg-gray-950 shadow-xl">
                    {filtered.map((p) => (
                        <li key={p.value}>
                            <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onChange(p.value);
                                    setOpen(false);
                                }}
                            >
                                <span className="text-white font-medium">{p.label}</span>
                                <span className="block text-[11px] text-gray-500 truncate">
                                    {p.value}
                                    {p.description ? ` — ${p.description}` : ""}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function AlertBanner({
    variant,
    children,
    onDismiss,
}: {
    variant: "error" | "success";
    children: React.ReactNode;
    onDismiss: () => void;
}) {
    const isError = variant === "error";
    return (
        <div
            className={`flex items-start gap-3 text-sm py-3 px-4 rounded-xl border ${
                isError
                    ? "bg-red-500/10 border-red-500/20 text-red-300"
                    : "bg-green-500/10 border-green-500/20 text-green-300"
            }`}
        >
            {isError ? <AlertCircle size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
            <span className="flex-1">{children}</span>
            <button type="button" onClick={onDismiss} className="opacity-70 hover:opacity-100">
                ×
            </button>
        </div>
    );
}
