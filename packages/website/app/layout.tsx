import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DUNNAA | Beleza e bem-estar na palma da sua mão",
  description:
    "Plataforma premium de agendamentos para beleza e bem-estar: conectamos clientes e estabelecimentos em um só lugar.",
  icons: {
    icon: "/store/favicon.svg",
    apple: "/store/favicon.svg",
  },
  openGraph: {
    title: "DUNNAA | Beleza e bem-estar na palma da sua mão",
    description:
      "Encontre salões, barbearias, spas e clínicas de estética. Agende horários e gerencie seu negócio.",
    images: [{ url: "/store/logodunadorado-web.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={plusJakarta.variable + " antialiased min-h-screen flex flex-col"}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
