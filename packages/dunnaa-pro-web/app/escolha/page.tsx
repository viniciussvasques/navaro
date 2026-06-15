"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { deleteCookie } from "cookies-next";
import { Store, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { ProBrandLockup } from "@/components/ProBrandLockup";

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "https://dunnaa.com.br";

export default function EscolhaPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 max-w-sm">
              <ProBrandLockup href="/" className="justify-center [&_span:first-child]:h-11 sm:[&_span:first-child]:h-12" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              O que você deseja fazer?
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Você ainda não tem um estabelecimento cadastrado
            </p>
          </div>

          <div className="space-y-4">
            <Card
              className="cursor-pointer transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
              onClick={() => router.push("/onboarding")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center">
                    <Store className="h-6 w-6 text-[var(--color-primary)]" />
                  </div>
                  Cadastrar meu estabelecimento
                </CardTitle>
                <CardDescription>
                  Gerencie agenda, equipe, fila e financeiro do seu negócio. Comece de graça.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-[var(--color-border)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-elevated)] flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-[var(--color-text-muted)]" />
                  </div>
                  Sou cliente
                </CardTitle>
                <CardDescription>
                  O Dunnaa Pro é para gestão de estabelecimentos. Use o app Dunnaa para agendar cortes e tratamentos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={`${WEBSITE_URL}/para-clientes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full">
                    Ir para app de clientes
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-sm text-[var(--color-text-muted)] mt-8">
            <button
              type="button"
              onClick={async () => {
                try {
                  await api.post("/auth/logout");
                } catch {}
                deleteCookie("pro_token");
                deleteCookie("pro_user_name");
                deleteCookie("pro_establishment_id");
                deleteCookie("pro_establishment_category");
                router.push("/login");
                router.refresh();
              }}
              className="text-[var(--color-primary)] hover:underline"
            >
              Sair e voltar ao login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
