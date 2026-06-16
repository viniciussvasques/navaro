"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProPageShell } from "@/components/ProPageShell";
import { ProPageHeader } from "@/components/ProPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Package,
  ShoppingCart,
  Star,
  Megaphone,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Supplier = {
  id: string;
  name: string;
  segment: string;
  rating: number | null;
  total_orders: number;
  total_reviews: number;
  verified: boolean;
  active: boolean;
};

const SEGMENT_LABELS: Record<string, string> = {
  chemicals: "Insumos Químicos",
  equipment: "Equipamentos",
  disposables: "Descartáveis",
  cosmetics: "Cosméticos",
  furniture: "Mobiliário",
  technology: "Tecnologia",
  other: "Outros",
};

export default function SupplierDashboardPage() {
  const router = useRouter();

  const { data: supplier, isLoading } = useQuery<Supplier | null>({
    queryKey: ["my-supplier"],
    queryFn: async () => {
      try {
        const res = await api.get("/suppliers/my");
        return res.data;
      } catch {
        return null;
      }
    },
  });

  if (isLoading) {
    return (
      <ProPageShell>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--color-primary)]" />
        </div>
      </ProPageShell>
    );
  }

  if (!supplier) {
    return (
      <ProPageShell maxWidth="md">
        <ProPageHeader
          title="Painel do Fornecedor"
          icon={Store}
          description="Venda seus produtos para estabelecimentos DUNNAA"
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <Store className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Torne-se um Fornecedor DUNNAA
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] max-w-sm">
                Cadastre sua empresa e acesse milhares de estabelecimentos prontos para comprar seus produtos.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-left w-full max-w-xs">
              {[
                "Catálogo digital de produtos",
                "Receba pedidos B2B direto na plataforma",
                "Controle de estoque integrado",
                "Promoções para clientes",
                "Avaliações e reputação",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <CheckCircle className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              className="w-full max-w-xs"
              onClick={() => router.push("/fornecedor/cadastro")}
            >
              Cadastrar como Fornecedor
            </Button>
          </CardContent>
        </Card>
      </ProPageShell>
    );
  }

  const stats = [
    {
      label: "Total de Pedidos",
      value: supplier.total_orders,
      icon: ShoppingCart,
      href: "/fornecedor/pedidos",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Avaliação Média",
      value: supplier.rating ? `${supplier.rating.toFixed(1)} ⭐` : "—",
      icon: Star,
      href: "/fornecedor/avaliacoes",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Avaliações",
      value: supplier.total_reviews,
      icon: TrendingUp,
      href: "/fornecedor/avaliacoes",
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
  ];

  const quickLinks = [
    { href: "/fornecedor/catalogo", label: "Catálogo", icon: Package, desc: "Gerenciar produtos" },
    { href: "/fornecedor/estoque", label: "Estoque", icon: AlertTriangle, desc: "Controle de estoque" },
    { href: "/fornecedor/pedidos", label: "Pedidos", icon: ShoppingCart, desc: "Pedidos recebidos" },
    { href: "/fornecedor/promocoes", label: "Promoções", icon: Megaphone, desc: "Campanhas ativas" },
  ];

  return (
    <ProPageShell>
      <ProPageHeader
        title="Painel do Fornecedor"
        icon={Store}
        description={supplier.name}
        actions={
          <div className="flex items-center gap-2">
            {supplier.verified && (
              <Badge className="bg-green-500/15 text-green-400 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" /> Verificado
              </Badge>
            )}
            <Badge variant="outline">
              {SEGMENT_LABELS[supplier.segment] ?? supplier.segment}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link href={stat.href} key={stat.label}>
              <Card className="hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">{stat.label}</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link href={link.href} key={link.href}>
              <Card className="hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">{link.label}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{link.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </ProPageShell>
  );
}
