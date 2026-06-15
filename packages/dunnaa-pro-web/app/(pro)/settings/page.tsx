"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { ProPageHeader } from "@/components/ProPageHeader";
import { ProPageShell } from "@/components/ProPageShell";
import {
  Settings,
  MapPin,
  Phone,
  Clock,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Users,
  Calendar,
  AlertCircle,
  Check,
  CreditCard,
  Banknote,
} from "lucide-react";
import { MercadoPagoConnectCard } from "@/components/MercadoPagoConnectCard";

type Establishment = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  queue_mode_enabled: boolean;
  accept_online_payment: boolean;
  accept_cash_payment: boolean;
  business_hours?: Record<string, { open: string; close: string; closed?: boolean }>;
  cancellation_fee_fixed?: number;
  no_show_fee_percent?: number;
  deposit_percent?: number;
  // Bank/PIX
  pix_key?: string | null;
  pix_key_type?: string | null;
  bank_name?: string | null;
  bank_agency?: string | null;
  bank_account?: string | null;
  bank_account_type?: string | null;
  bank_holder_name?: string | null;
  bank_holder_document?: string | null;
  auto_payout_enabled?: boolean;
};

const WEEKDAYS = [
  { key: "mon", label: "Segunda" },
  { key: "tue", label: "Terca" },
  { key: "wed", label: "Quarta" },
  { key: "thu", label: "Quinta" },
  { key: "fri", label: "Sexta" },
  { key: "sat", label: "Sabado" },
  { key: "sun", label: "Domingo" },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings-establishment"],
    queryFn: async () => {
      const myRes = await api.get("/establishments/my");
      const list = Array.isArray(myRes.data) ? myRes.data : [];
      return (list[0] ?? null) as Establishment | null;
    },
  });

  const [form, setForm] = useState<Partial<Establishment>>({});
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed?: boolean }>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        description: data.description || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip_code: data.zip_code || "",
        phone: data.phone || "",
        whatsapp: data.whatsapp || "",
        queue_mode_enabled: data.queue_mode_enabled,
        cancellation_fee_fixed: data.cancellation_fee_fixed || 0,
        no_show_fee_percent: data.no_show_fee_percent || 0,
        deposit_percent: data.deposit_percent || 0,
      });
      setHours(data.business_hours || {});
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.patch(`/establishments/${data!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-establishment"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      ...form,
      business_hours: hours,
    });
  };

  const updateHour = (day: string, field: "open" | "close", value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], open: prev[day]?.open || "09:00", close: prev[day]?.close || "18:00", [field]: value },
    }));
  };

  const toggleDay = (day: string) => {
    setHours((prev) => {
      if (prev[day]) {
        const copy = { ...prev };
        delete copy[day];
        return copy;
      }
      return { ...prev, [day]: { open: "09:00", close: "18:00" } };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!data) {
  return (
    <ProPageShell maxWidth="lg">
      <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-text-muted)]">
            Nenhum estabelecimento encontrado. Conclua o onboarding primeiro.
          </CardContent>
        </Card>
    </ProPageShell>
    );
  }

  return (
    <ProPageShell maxWidth="lg">
      <ProPageHeader
        title="Configurações"
        description="Edite os dados e configurações do seu estabelecimento."
        icon={Settings}
        actions={
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : saved ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saved ? "Salvo!" : "Salvar"}
          </Button>
        }
      />

      {saveMutation.isError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" />
          Erro ao salvar. Tente novamente.
        </div>
      )}

      {/* Profile */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Dados do Estabelecimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Nome</label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Categoria</label>
              <Input value={data.category.replace(/_/g, " ")} disabled className="capitalize" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Descricao</label>
            <textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Endereco</label>
              <Input
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Cidade</label>
                <Input
                  value={form.city || ""}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">UF</label>
                <Input
                  value={form.state || ""}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Telefone</label>
              <Input
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">WhatsApp</label>
              <Input
                value={form.whatsapp || ""}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">CEP</label>
              <Input
                value={form.zip_code || ""}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue + Appointment Config */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Modo de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="p-4 rounded-xl bg-[var(--color-background)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Agendamento
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Clientes agendam horario com antecedencia
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Sempre ativo
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--color-background)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Modo Fila (Walk-in)
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Clientes sem agendamento entram na fila e esperam ser chamados
                </p>
              </div>
              <button
                onClick={() => setForm({ ...form, queue_mode_enabled: !form.queue_mode_enabled })}
                className="flex items-center"
              >
                {form.queue_mode_enabled ? (
                  <ToggleRight className="h-8 w-8 text-[var(--color-primary)]" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-[var(--color-text-muted)]" />
                )}
              </button>
            </div>
            {form.queue_mode_enabled && (
              <div className="pl-2 border-l-2 border-[var(--color-primary)]/20 space-y-1 mt-2">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Com o modo fila ativo, o estabelecimento aceita <strong>agendamentos + walk-ins ao mesmo tempo</strong>.
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Clientes com agendamento fazem check-in ao chegar. Clientes sem agendamento entram na fila pelo app.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                Taxa cancelamento tardio (R$)
              </label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={form.cancellation_fee_fixed || 0}
                onChange={(e) => setForm({ ...form, cancellation_fee_fixed: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                Taxa no-show (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.no_show_fee_percent || 0}
                onChange={(e) => setForm({ ...form, no_show_fee_percent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                Sinal / deposito (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={5}
                value={form.deposit_percent || 0}
                onChange={(e) => setForm({ ...form, deposit_percent: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Config */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            Defina como seus clientes podem pagar pelos servicos.
          </p>

          <div className="p-4 rounded-xl bg-[var(--color-background)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Pagamento pelo app (PIX)
                </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          O cliente paga via PIX/cartão ao agendar. Com OAuth Mercado Pago conectado, o split é automático. Sem OAuth, use repasse via chave PIX abaixo.
                        </p>
              </div>
              <button
                onClick={() => setForm({ ...form, accept_online_payment: !form.accept_online_payment })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  form.accept_online_payment ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                    form.accept_online_payment ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Pagamento na hora
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  O cliente paga no local (dinheiro, cartao ou PIX direto).
                </p>
              </div>
              <button
                onClick={() => setForm({ ...form, accept_cash_payment: !form.accept_cash_payment })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  form.accept_cash_payment ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                    form.accept_cash_payment ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <strong>Dica:</strong> Ativando pagamento pelo app, seus agendamentos sao confirmados automaticamente apos o pagamento. Conecte o Mercado Pago abaixo para split automatico da taxa DUNNAA.
            </p>
          </div>
        </CardContent>
      </Card>

      <Suspense fallback={null}>
        <MercadoPagoConnectCard />
      </Suspense>

      {/* Bank / PIX Data for auto-payout */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Dados para Recebimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-[var(--color-text-muted)]">
            Cadastre sua chave PIX ou conta bancaria para receber automaticamente apos cada pagamento via app. A taxa da plataforma e descontada automaticamente.
          </p>

          {/* Auto-payout toggle */}
          <div className="p-4 rounded-xl bg-[var(--color-background)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Repasse automatico
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Receba automaticamente apos cada pagamento (taxa descontada).
                </p>
              </div>
              <button
                onClick={() => setForm({ ...form, auto_payout_enabled: !form.auto_payout_enabled })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  form.auto_payout_enabled ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                    form.auto_payout_enabled ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* PIX Key */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Tipo da chave PIX</label>
              <select
                value={form.pix_key_type || ""}
                onChange={(e) => setForm({ ...form, pix_key_type: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              >
                <option value="">Selecione...</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
                <option value="random">Chave aleatoria</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Chave PIX</label>
              <Input
                value={form.pix_key || ""}
                onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                placeholder="Sua chave PIX"
              />
            </div>
          </div>

          {/* Holder info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Nome do titular</label>
              <Input
                value={form.bank_holder_name || ""}
                onChange={(e) => setForm({ ...form, bank_holder_name: e.target.value })}
                placeholder="Nome completo ou razao social"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">CPF/CNPJ do titular</label>
              <Input
                value={form.bank_holder_document || ""}
                onChange={(e) => setForm({ ...form, bank_holder_document: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          {/* Bank account (optional, for backup) */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-[var(--color-primary)] font-medium">
              Conta bancaria (opcional, caso prefira TED)
            </summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Banco</label>
                <Input
                  value={form.bank_name || ""}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="Ex: Nubank, Itau"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Agencia</label>
                <Input
                  value={form.bank_agency || ""}
                  onChange={(e) => setForm({ ...form, bank_agency: e.target.value })}
                  placeholder="0001"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Conta</label>
                <Input
                  value={form.bank_account || ""}
                  onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                  placeholder="12345-6"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Tipo de conta</label>
              <select
                value={form.bank_account_type || ""}
                onChange={(e) => setForm({ ...form, bank_account_type: e.target.value })}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              >
                <option value="">Selecione...</option>
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupanca</option>
              </select>
            </div>
          </details>

          {form.auto_payout_enabled && !form.pix_key && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                <strong>Atencao:</strong> Repasse automatico esta ativado mas voce ainda nao cadastrou uma chave PIX. Cadastre para receber automaticamente.
              </p>
            </div>
          )}

          {form.pix_key && form.auto_payout_enabled && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Tudo configurado! Apos cada pagamento via app, o valor sera repassado automaticamente para sua chave PIX descontando a taxa da plataforma.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horario de Funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {WEEKDAYS.map(({ key, label }) => {
            const isOpen = !!hours[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 bg-[var(--color-background)]"
              >
                <div className="flex items-center gap-3 min-w-[100px]">
                  <button
                    onClick={() => toggleDay(key)}
                    className={`w-5 h-5 rounded flex items-center justify-center text-xs border ${
                      isOpen
                        ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                        : "border-[var(--color-border)] text-transparent"
                    }`}
                  >
                    {isOpen && <Check className="h-3 w-3" />}
                  </button>
                  <span className={`text-sm font-medium ${isOpen ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}>
                    {label}
                  </span>
                </div>

                {isOpen ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={hours[key]?.open || "09:00"}
                      onChange={(e) => updateHour(key, "open", e.target.value)}
                      className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)]"
                    />
                    <span className="text-xs text-[var(--color-text-muted)]">ate</span>
                    <input
                      type="time"
                      value={hours[key]?.close || "18:00"}
                      onChange={(e) => updateHour(key, "close", e.target.value)}
                      className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)]"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">Fechado</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </ProPageShell>
  );
}
