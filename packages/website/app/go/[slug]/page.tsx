import { Metadata } from "next";
import GoPageClient from "./GoPageClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.dunnaa.com.br/api/v1";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getEstablishment(slug: string) {
  try {
    const res = await fetch(`${API_URL}/establishments/slug/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const est = await getEstablishment(slug);
  const name = est?.name || "Estabelecimento";

  return {
    title: `${name} | Dunnaa - Agende agora`,
    description: `Escaneou o QR Code de ${name}? Baixe o app Dunnaa e agende seu horario agora mesmo!`,
    openGraph: {
      title: `${name} no Dunnaa`,
      description: `Agende seu horario em ${name} pelo app Dunnaa. Rapido, facil e gratuito.`,
      images: est?.logo_url ? [{ url: est.logo_url }] : [],
    },
  };
}

export default async function GoPage({ params }: Props) {
  const { slug } = await params;
  const est = await getEstablishment(slug);

  return <GoPageClient slug={slug} establishment={est} />;
}
