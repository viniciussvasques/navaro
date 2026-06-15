"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setCookie } from "cookies-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2, Phone, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { AuthShell } from "@/components/AuthShell";

type LoginMethod = "phone" | "email";

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<LoginMethod>("phone");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const RESEND_COOLDOWN_SEC = 40;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      
      // Verifica se o código foi enviado com sucesso
      if (data.whatsapp_sent === true) {
        setCodeSent(true);
        setResendCooldown(RESEND_COOLDOWN_SEC);
        setSuccess("Código enviado! Verifique seu WhatsApp.");
      } else if (data.whatsapp_sent === false) {
        // WhatsApp tentou enviar mas falhou
        const errorMsg = data.whatsapp_error || "Falha ao enviar WhatsApp";
        setError(`⚠️ ${errorMsg}. Verifique se o número está correto ou tente novamente em alguns instantes.`);
      } else if (data.whatsapp_sent === null || data.whatsapp_sent === undefined) {
        // WhatsApp não habilitado/configurado
        setError("WhatsApp não está configurado no sistema. Entre em contato com o suporte ou use login por e-mail.");
      } else {
        // Caso inesperado
        setError("Não foi possível enviar o código. Tente novamente ou use login por e-mail.");
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
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Código inválido ou expirado. Tente novamente."));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const { user, tokens } = data;
      if (tokens?.access_token) {
        setCookie("pro_token", tokens.access_token, { maxAge: 60 * 60 * 24, sameSite: "lax" });
      }
      if (user?.name) {
        setCookie("pro_user_name", user.name, { maxAge: 60 * 60 * 24 });
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "E-mail ou senha incorretos."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="DUNNAA Pro" subtitle="Gestão premium do seu estabelecimento" maxWidth="sm">
        <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              Escolha como deseja acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Method selector */}
            <div className="flex gap-2 mb-6 p-1 bg-[var(--color-surface)] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMethod("phone");
                  setCodeSent(false);
                  setResendCooldown(0);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition ${
                  method === "phone"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Phone className="h-4 w-4" />
                Telefone
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod("email");
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition ${
                  method === "email"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Mail className="h-4 w-4" />
                E-mail
              </button>
            </div>

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

            {/* Phone OTP Login */}
            {method === "phone" && (
              <div className="space-y-4">
                {!codeSent ? (
                  <>
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
                  </>
                ) : (
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
                      <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                        Digite o código de 6 dígitos recebido no WhatsApp
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingCode || resendCooldown > 0 || verifyingCode}
                      className="w-full text-sm text-[var(--color-primary)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                    >
                      {sendingCode ? (
                        "Enviando..."
                      ) : resendCooldown > 0 ? (
                        `Reenviar código em ${resendCooldown}s`
                      ) : (
                        "Reenviar código"
                      )}
                    </button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCodeSent(false);
                          setCode("");
                          setResendCooldown(0);
                          setError(null);
                          setSuccess(null);
                        }}
                        className="flex-1"
                        disabled={verifyingCode}
                      >
                        Voltar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={verifyingCode || code.length !== 6}
                      >
                        {verifyingCode ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          "Entrar"
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Email/Password Login */}
            {method === "email" && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    E-mail
                  </label>
                  <Input
                    type="email"
                    placeholder="seu@estabelecimento.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
                    Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
          Não tem conta?{" "}
          <Link href="/register" className="text-[var(--color-primary)] font-medium hover:underline">
            Cadastre-se
          </Link>
        </p>
    </AuthShell>
  );
}
