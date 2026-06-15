"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setCookie } from "cookies-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { AuthShell } from "@/components/AuthShell";

const RESEND_COOLDOWN_SEC = 40;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [completing, setCompleting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError("Digite um número de telefone válido");
      return;
    }
    setSendingCode(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.post("/auth/send-code", { phone: phone.trim() });
      if (data.whatsapp_sent === true) {
        setCodeSent(true);
        setStep(2);
        setResendCooldown(RESEND_COOLDOWN_SEC);
        setSuccess("Código enviado! Verifique seu WhatsApp.");
      } else if (data.whatsapp_sent === false) {
        // WhatsApp tentou enviar mas falhou
        const msg = data.whatsapp_error || "Falha ao enviar WhatsApp";
        setError(`⚠️ ${msg}. Verifique se o número está correto ou tente novamente em alguns instantes.`);
      } else if (data.whatsapp_sent === null || data.whatsapp_sent === undefined) {
        // WhatsApp não habilitado/configurado
        setError("WhatsApp não está configurado no sistema. Entre em contato com o suporte.");
      } else {
        // Caso inesperado
        setError("Não foi possível enviar o código. Tente novamente.");
      }
    } catch (err: unknown) {
      const errorMsg = getApiErrorMessage(err, "Erro ao enviar código. Tente novamente.");
      setError(`⚠️ ${errorMsg}`);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      setError("Digite o código de 6 dígitos");
      return;
    }
    setVerifyingCode(true);
    setError(null);
    try {
      const { data } = await api.post("/auth/verify", {
        phone: phone.trim(),
        code: code.trim(),
      });
      const { user, tokens } = data;
      if (tokens?.access_token) {
        setCookie("pro_token", tokens.access_token, { maxAge: 60 * 60 * 24, sameSite: "lax" });
      }
      if (user?.name) {
        setCookie("pro_user_name", user.name, { maxAge: 60 * 60 * 24 });
        setName(user.name);
      }
      if (user?.email) setEmail(user.email);
      setStep(3);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Código inválido ou expirado. Tente novamente."));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.length < 2) {
      setError("Digite seu nome (mínimo 2 caracteres)");
      return;
    }
    if (!email.trim()) {
      setError("Digite seu e-mail");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("E-mail inválido");
      return;
    }
    if (!password || password.length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    setCompleting(true);
    setError(null);
    try {
      await api.post("/auth/complete-registration", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setCookie("pro_user_name", name.trim(), { maxAge: 60 * 60 * 24 });
      router.push("/escolha");
      router.refresh();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Erro ao concluir cadastro. Tente novamente."));
    } finally {
      setCompleting(false);
    }
  };

  const stepSubtitle =
    step === 1 ? "Criar conta com telefone" : step === 2 ? "Verificar código" : "Complete seu perfil";

  return (
    <AuthShell eyebrow="Cadastro Pro" subtitle={stepSubtitle} maxWidth="sm">
        <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Criar conta</CardTitle>
            <CardDescription>
              {step === 1 && "Informe seu número para receber o código de verificação"}
              {step === 2 && "Digite o código de 6 dígitos recebido no WhatsApp"}
              {step === 3 && "Nome, e-mail e senha para login alternativo"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 rounded-xl px-3 py-2 mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-[var(--color-success)] bg-[var(--color-success)]/10 rounded-xl px-3 py-2 mb-4">
                {success}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    Número de telefone
                  </label>
                  <Input
                    type="tel"
                    placeholder="+5511999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={sendingCode}
                  />
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    Enviaremos um código via WhatsApp
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSendCode}
                  className="w-full"
                  disabled={sendingCode || !phone.trim()}
                >
                  {sendingCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar código"
                  )}
                </Button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    Código de verificação
                  </label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setCode(val);
                    }}
                    maxLength={6}
                    disabled={verifyingCode}
                    className="text-center text-lg tracking-widest"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || resendCooldown > 0}
                  className="w-full text-sm text-[var(--color-primary)] hover:underline disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
                </button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      setCodeSent(false);
                      setCode("");
                      setResendCooldown(0);
                      setError(null);
                    }}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={verifyingCode || code.length !== 6}>
                    {verifyingCode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verificar"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleCompleteRegistration} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    Nome completo *
                  </label>
                  <Input
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={completing}
                    minLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    E-mail *
                  </label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={completing}
                  />
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Você poderá fazer login com e-mail e senha depois
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    Senha (mín. 6 caracteres) *
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={completing}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={completing}>
                  {completing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Concluindo...
                    </>
                  ) : (
                    "Concluir cadastro"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
          Já tem conta?{" "}
          <Link href="/login" className="text-[var(--color-primary)] font-medium hover:underline">
            Entrar
          </Link>
        </p>
    </AuthShell>
  );
}
